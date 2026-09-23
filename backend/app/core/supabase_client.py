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


async def supabase_sign_up(email: str, password: str, metadata: dict | None = None) -> dict:
    """Create auth user via Supabase Auth API. Returns session/user payload."""
    async with httpx.AsyncClient(base_url=settings.SUPABASE_URL, timeout=30) as client:
        resp = await client.post(
            "/auth/v1/signup",
            headers={"apikey": settings.SUPABASE_ANON_KEY},
            json={
                "email": email,
                "password": password,
                "data": metadata or {},
            },
        )
        if resp.status_code >= 400:
            detail = resp.json().get("msg", resp.text) if resp.headers.get("content-type", "").startswith("application/json") else resp.text
            raise RuntimeError(detail)
        return resp.json()


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
