"""Domain exceptions with consistent JSON error contract."""
from fastapi import Request, status
from fastapi.responses import JSONResponse


class AgriSphereError(Exception):
    """Base app exception."""

    status_code = 500
    detail = "Internal server error"

    def __init__(self, detail: str | None = None):
        if detail:
            self.detail = detail
        super().__init__(self.detail)


class NotFoundError(AgriSphereError):
    status_code = 404
    detail = "Resource not found"


class ValidationError(AgriSphereError):
    status_code = 422
    detail = "Validation error"


class AIError(AgriSphereError):
    status_code = 502
    detail = "AI service unavailable"


class AuthError(AgriSphereError):
    status_code = 401
    detail = "Unauthorized"


class ExternalServiceError(AgriSphereError):
    status_code = 502
    detail = "External service error"


async def agrisphere_error_handler(request: Request, exc: AgriSphereError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.__class__.__name__,
                "detail": exc.detail,
                "path": request.url.path,
            }
        },
    )


def register_exception_handlers(app) -> None:
    app.add_exception_handler(AgriSphereError, agrisphere_error_handler)
