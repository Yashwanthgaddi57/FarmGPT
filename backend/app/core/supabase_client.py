"""Supabase admin client (service role) and auth helpers via REST API."""
from typing import Any

import httpx

from app.core.config import settings

_admin: Any = None


class SupabaseAuthError(RuntimeError):
    """Auth failure with the upstream Supabase error code attached."""

    def __init__(self, message: str, error_code: str | None = None):
        super().__init__(message)
        self.error_code = error_code or ""


def get_admin_client():
    """Service-role Supabase client for backend DB/storage/auth operations."""
    global _admin
    if _admin is None:
        from supabase import create_client

        _admin = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return _admin


def _supabase_msg(resp: httpx.Response) -> str:
    """Extract Supabase's human-readable error message from a response."""
    if resp.headers.get("content-type", "").startswith("application/json"):
        try:
            return resp.json().get("msg", resp.text)
        except Exception:
            pass
    return resp.text


def _service_key_ok() -> bool:
    """True when SUPABASE_SERVICE_KEY looks like a real service-role secret.

    Supabase service-role keys come in two forms: the modern 3-segment JWT
    (eyJ...) and the legacy sb_secret_... string. The render.yaml default is
    the placeholder 'your-service-role-key', which the admin API rejects with
    'invalid JWT'. Detect that and fall back to the anon signup path instead
    of breaking signup when the secret isn't configured.
    """
    key = (settings.SUPABASE_SERVICE_KEY or "").strip()
    if not key or "your" in key.lower():
        return False
    return key.count(".") == 2 or key.startswith("sb_secret_")


def _normalize_session(resp_json: dict) -> dict:
    """Unify the two Supabase response shapes into one auth contract."""
    sess = resp_json.get("session") or {}
    user = resp_json.get("user") or {}
    return {
        "access_token": sess.get("access_token"),
        "refresh_token": sess.get("refresh_token"),
        "expires_in": sess.get("expires_in"),
        "token_type": sess.get("token_type", "bearer"),
        "user": user,
        "message": resp_json.get("message", ""),
    }


async def _admin_signup_and_signin(
    client: httpx.AsyncClient,
    email: str,
    password: str,
    admin_headers: dict,
    anon_headers: dict,
    user_data: dict,
) -> dict:
    """Create a CONFIRMED user via the admin API (no email), then sign in."""
    create = await client.post(
        "/auth/v1/admin/users",
        headers=admin_headers,
        json={
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": user_data,
        },
    )
    if create.status_code >= 400 and "already registered" not in _supabase_msg(create).lower():
        raise RuntimeError(_supabase_msg(create))

    session = await client.post(
        "/auth/v1/token?grant_type=password",
        headers=anon_headers,
        json={"email": email, "password": password},
    )
    if session.status_code >= 400 and "confirm" in _supabase_msg(session).lower():
        # Older deploy left the account unconfirmed; confirm it, then retry.
        await _mark_email_confirmed(client, admin_headers, email)
        session = await client.post(
            "/auth/v1/token?grant_type=password",
            headers=anon_headers,
            json={"email": email, "password": password},
        )
    if session.status_code >= 400:
        raise RuntimeError(_supabase_msg(session))
    return _normalize_session(session.json())


async def _anon_signup(
    client: httpx.AsyncClient,
    email: str,
    password: str,
    anon_headers: dict,
    user_data: dict,
) -> dict:
    """Standard anon signup (email-confirmation path). Respects project settings."""
    resp = await client.post(
        "/auth/v1/signup",
        headers=anon_headers,
        json={"email": email, "password": password, "data": user_data},
    )
    if resp.status_code >= 400:
        msg = _supabase_msg(resp)
        if "rate limit" in msg.lower():
            raise RuntimeError(
                "Too many signup attempts right now. Please wait a few minutes and try again."
            )
        raise RuntimeError(msg)
    return _normalize_session(resp.json())


async def supabase_sign_up(email: str, password: str, metadata: dict | None = None) -> dict:
    """Create an auth user and return a normalized session payload.

    Admin path (when SUPABASE_SERVICE_KEY is a real service-role JWT): creates
    the user already confirmed, then mints a session via the password grant.
    Sends NO confirmation email, sidestepping Supabase's free-tier email rate
    limit ("email rate limit exceeded").

    Anon fallback (when the service key is unset/placeholder): the standard
    email-confirmation signup. This keeps registration working on projects
    where the service key hasn't been configured yet — the result simply has
    `access_token=None` and needs_email_confirmation=True.

    `metadata` is stored as user_metadata so get_current_user can hydrate the
    full profile on the first authenticated request.
    """
    key = (settings.SUPABASE_SERVICE_KEY or "").strip()
    legacy = key.startswith("sb_secret_")
    admin_headers = {
        "apikey": key if legacy else settings.SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {key}",
    }
    anon_headers = {"apikey": settings.SUPABASE_ANON_KEY}
    user_data = metadata or {}

    async with httpx.AsyncClient(base_url=settings.SUPABASE_URL, timeout=30) as client:
        if _service_key_ok():
            return await _admin_signup_and_signin(
                client, email, password, admin_headers, anon_headers, user_data
            )
        return await _anon_signup(client, email, password, anon_headers, user_data)


async def _mark_email_confirmed(client: httpx.AsyncClient, admin_headers: dict, email: str) -> None:
    """Best-effort: confirm an existing user found by email. Never raises."""
    try:
        listed = await client.get(
            "/auth/v1/admin/users",
            headers=admin_headers,
            params={"email": email},
        )
        if listed.status_code != 200:
            return
        for u in listed.json().get("users", []):
            if (u.get("email") or "").lower() == email.lower():
                await client.put(
                    f"/auth/v1/admin/users/{u['id']}",
                    headers=admin_headers,
                    json={"email_confirm": True},
                )
                return
    except Exception:
        pass


async def supabase_sign_in(email: str, password: str) -> dict:
    async with httpx.AsyncClient(base_url=settings.SUPABASE_URL, timeout=30) as client:
        resp = await client.post(
            "/auth/v1/token?grant_type=password",
            headers={"apikey": settings.SUPABASE_ANON_KEY},
            json={"email": email, "password": password},
        )
        if resp.status_code >= 400:
            try:
                body = resp.json()
                detail = body.get("msg", resp.text)
                code = body.get("error_code", "")
            except Exception:
                detail, code = resp.text, ""
            raise SupabaseAuthError(detail, code)
        return resp.json()


async def admin_get_user_by_email(email: str) -> dict | None:
    """Service-role lookup, used to give users actionable login errors.

    Returns the raw admin user object, or None if not found / lookup fails
    (lookup failure must never block the standard error path).
    """
    key = (settings.SUPABASE_SERVICE_KEY or "").strip()
    legacy = key.startswith("sb_secret_")
    try:
        async with httpx.AsyncClient(base_url=settings.SUPABASE_URL, timeout=15) as client:
            resp = await client.get(
                "/auth/v1/admin/users",
                params={"per_page": 200},
                headers={
                    "apikey": key if legacy else settings.SUPABASE_ANON_KEY,
                    "Authorization": f"Bearer {key}",
                },
            )
            if resp.status_code != 200:
                return None
            for u in resp.json().get("users", []):
                if (u.get("email") or "").lower() == email.strip().lower():
                    return u
    except Exception:
        return None
    return None


async def supabase_reset_password(email: str, redirect_to: str) -> None:
    async with httpx.AsyncClient(base_url=settings.SUPABASE_URL, timeout=30) as client:
        resp = await client.post(
            "/auth/v1/recover",
            headers={"apikey": settings.SUPABASE_ANON_KEY},
            json={"email": email, "redirect_to": redirect_to},
        )
        if resp.status_code >= 400:
            raise RuntimeError("Failed to send password reset email")


async def upload_disease_image(user_id: str, filename: str, content: bytes) -> str:
    """Upload to the disease-images bucket under user folder; returns public URL."""
    client = get_admin_client()
    path = f"{user_id}/{filename}"
    client.storage.from_("disease-images").upload(
        path,
        content,
        {"content-type": "image/jpeg", "upsert": "true"},
    )
    return client.storage.from_("disease-images").get_public_url(path)
