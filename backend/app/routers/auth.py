"""Authentication endpoints: Supabase Auth in production, local fallback for local runs."""
import logging

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import AuthError
from app.core.local_auth import (
    authenticate_local_user,
    issue_local_tokens,
    local_auth_enabled,
    register_local_user,
)
from app.core.supabase_client import (
    admin_get_user_by_email,
    supabase_reset_password,
    supabase_sign_in,
    supabase_sign_up,
)
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
)

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger("app.api.auth")


@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """Create an auth user. Local mode: immediately active.

    Production uses the Supabase admin API to create the user confirmed and
    mints a session via the password grant, so signup returns tokens directly
    (no confirmation email — see supabase_sign_up for the rate-limit rationale).
    """
    if local_auth_enabled():
        try:
            user = register_local_user(db, payload.model_dump())
        except ValueError as e:
            raise AuthError(str(e)) from e
        tokens = issue_local_tokens(user)
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={
                "message": "Registration successful.",
                **tokens,
            },
        )

    metadata = {
        "name": payload.name,
        "phone": payload.phone,
        "district": payload.district,
        "state": payload.state,
        "village": payload.village,
        "farm_size_acres": payload.farm_size_acres,
        "soil_type": payload.soil_type,
        "water_availability": payload.water_availability,
    }
    try:
        session = await supabase_sign_up(payload.email, payload.password, metadata)
    except Exception as e:
        raise AuthError(str(e)) from e
    content: dict = {
        "message": "Registration successful.",
        "user": session.get("user", {}),
    }
    if session.get("access_token"):
        content.update(
            access_token=session["access_token"],
            refresh_token=session["refresh_token"],
            expires_in=session.get("expires_in") or 3600,
            token_type=session.get("token_type", "bearer"),
        )
    else:
        content["message"] = (
            "Registration successful. Please check your email to confirm your account."
        )
        content["needs_email_confirmation"] = True
    return JSONResponse(status_code=status.HTTP_201_CREATED, content=content)


@router.post("/login")
async def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Password grant: local DB in local mode, Supabase Auth in production."""
    email = payload.email.strip().lower()
    logger.info("Login attempt for %s", email)
    if local_auth_enabled():
        user = authenticate_local_user(db, payload.email, payload.password)
        if not user:
            logger.warning("Login failed (local mode) for %s: invalid credentials", email)
            raise AuthError("Invalid email or password")
        return JSONResponse(status_code=200, content=issue_local_tokens(user))

    try:
        session = await supabase_sign_in(payload.email, payload.password)
    except Exception as e:
        code = getattr(e, "error_code", "") or ""
        msg = str(e).lower()

        logger.warning("Login failed for %s: code=%s msg=%s", email, code, str(e)[:200])

        if code == "email_not_confirmed" or "confirm" in msg:
            raise AuthError(
                "Please confirm your email first — check your inbox for the "
                "verification link before signing in."
            ) from e

        if code == "over_request_rate_limit" or "rate limit" in msg:
            raise AuthError("Too many attempts. Please wait a minute and try again.") from e

        # invalid_credentials: distinguish 'no such account' vs 'wrong password'
        # vs 'account exists but is Google-only'.
        user = await admin_get_user_by_email(email)
        if user is None:
            raise AuthError(
                "No account found for this email. Please register first, or "
                "continue with Google."
            ) from e
        providers = (user.get("app_metadata") or {}).get("providers") or [user.get("app_metadata", {}).get("provider")]
        if any(p == "google" for p in providers if p) and not (user.get("encrypted_password") or "").strip():
            raise AuthError(
                "This email is registered with Google sign-in. "
                "Please use 'Continue with Google', or set a password for "
                "your account via 'Forgot password'."
            ) from e

        raise AuthError("Invalid email or password") from e

    return JSONResponse(
        status_code=200,
        content={
            "access_token": session["access_token"],
            "refresh_token": session["refresh_token"],
            "expires_in": session.get("expires_in", 3600),
            "token_type": "bearer",
            "user": session.get("user", {}),
        },
    )


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(payload: ForgotPasswordRequest):
    if local_auth_enabled():
        return {
            "message": "Local mode: password resets are managed by the administrator. "
            "Delete backend/agrisphere_local.db and re-register to reset credentials."
        }
    redirect = f"{settings.FRONTEND_APP_URL.rstrip('/')}/auth/reset-password"
    try:
        await supabase_reset_password(payload.email, redirect)
    except Exception as e:
        raise AuthError(str(e)) from e
    return {"message": "Password reset email sent if the account exists."}
