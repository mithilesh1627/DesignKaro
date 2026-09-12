import datetime
import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, description="Password with minimum 8 characters")
    username: str = Field(..., min_length=3, max_length=32, pattern="^[a-zA-Z0-9_-]+$")
    full_name: str | None = None
    experience_level: str | None = Field("beginner", description="beginner, intermediate, advanced")


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    username: str
    full_name: str | None = None
    bio: str | None = None
    experience_level: str
    current_rank: str
    target_qps: int


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    is_active: bool
    is_superuser: bool
    created_at: datetime.datetime


class UserMeResponse(UserResponse):
    profile: UserProfileResponse | None = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserMeResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class TokenPayload(BaseModel):
    sub: str | None = None
    type: str | None = None
