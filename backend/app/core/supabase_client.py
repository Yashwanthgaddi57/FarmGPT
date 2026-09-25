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


async def supabase_sign_up(email: str, password: str, metadata: dict | None = None) -> dict:
    """Create an auth user and return a live access session.

    The user is created via the service-role admin API with the email already
    confirmed, then a session is issued via the password grant. This sends NO
    confirmation email: on Supabase's free tier the email-confirmation signup
    path is aggressively rate-limited ("email rate limit exceeded"), which
    blocks manual account creation entirely. Admin create + password grant are
    not email-based, so signup works reliably and the user is signed in at once.

    `metadata` is stored as `user_metadata` so `get_current_user` can hydrate
    the full profile on the first authenticated request.
    """
    admin_headers = {
        "apikey": settings.SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
    }
    anon_headers = {"apikey": settings.SUPABASE_ANON_KEY}
    user_data = metadata or {}

    async with httpx.AsyncClient(base_url=settings.SUPABASE_URL, timeout=30) as client:
        # 1) Create the user, confirmed — via the admin API (no email sent).
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
        if create.status_code >= 400:
            # Allow retries against accounts created by earlier deploys.
            if "already registered" not in _supabase_msg(create).lower():
                raise RuntimeError(_supabase_msg(create))

        # 2) Mint a session via the password grant. The user is confirmed, so
        #    no confirmation email is sent -> immune to the email rate limit.
        session = await client.post(
            "/auth/v1/token?grant_type=password",
            headers=anon_headers,
            json={"email": email, "password": password},
        )
        if session.status_code >= 400 and "confirm" in _supabase_msg(session).lower():
            # An older deploy may have left the account unconfirmed. Confirm it
            # via the admin API and retry the password grant once.
            await _mark_email_confirmed(client, admin_headers, email)
            session = await client.post(
                "/auth/v1/token?grant_type=password",
                headers=anon_headers,
                json={"email": email, "password": password},
            )
        if session.status_code >= 400:
            raise RuntimeError(_supabase_msg(session))
        return session.json()


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
    try:
        async with httpx.AsyncClient(base_url=settings.SUPABASE_URL, timeout=15) as client:
            resp = await client.get(
                "/auth/v1/admin/users",
                params={"per_page": 200},
                headers={
                    "apikey": settings.SUPABASE_SERVICE_KEY,
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
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
