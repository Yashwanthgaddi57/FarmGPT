"""Auth request/response schemas."""
from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=1, max_length=120)
    phone: str | None = Field(default=None, max_length=20)
    district: str | None = Field(default=None, max_length=120)
    state: str | None = Field(default=None, max_length=120)
    village: str | None = Field(default=None, max_length=120)
    farm_size_acres: float = Field(default=0, ge=0)
    soil_type: str = "unknown"
    water_availability: str = "rainfed"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    token_type: str = "bearer"
    user: dict


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    password: str = Field(min_length=8, max_length=128)


class MessageResponse(BaseModel):
    message: str
