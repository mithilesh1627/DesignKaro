import uuid
from typing import Annotated

import jwt
from backend.app.api.deps import get_current_user
from backend.app.core.database import get_db
from backend.app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from backend.app.models.user import AuditLog, User, UserProfile
from backend.app.schemas.user import (
    RefreshTokenRequest,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserMeResponse,
)
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

router = APIRouter()


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register new user",
)
async def register(
    user_in: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
):
    """
    Registers a new user account, creates their developer profile, and returns authentication tokens.
    """
    # Check if email or username exists
    existing_user_stmt = select(User).where(User.email == user_in.email)
    existing_user_res = await db.execute(existing_user_stmt)
    if existing_user_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )

    existing_profile_stmt = select(UserProfile).where(UserProfile.username == user_in.username)
    existing_profile_res = await db.execute(existing_profile_stmt)
    if existing_profile_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This username is already taken.",
        )

    # Create User and Profile
    new_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        is_active=True,
        is_superuser=False,
    )
    db.add(new_user)
    await db.flush()

    new_profile = UserProfile(
        user_id=new_user.id,
        username=user_in.username,
        full_name=user_in.full_name,
        experience_level=user_in.experience_level or "beginner",
        current_rank="Associate Architect",
        target_qps=10000,
    )
    db.add(new_profile)

    # Log audit event
    audit = AuditLog(
        user_id=new_user.id,
        action="user_registered",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        event_metadata={"email": new_user.email, "username": new_profile.username},
    )
    db.add(audit)

    await db.commit()
    await db.refresh(new_user)

    # Fetch with profile loaded
    stmt = select(User).where(User.id == new_user.id).options(selectinload(User.profile))
    user_loaded = (await db.execute(stmt)).scalar_one()

    access_token = create_access_token(subject=user_loaded.id)
    refresh_token = create_refresh_token(subject=user_loaded.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserMeResponse.model_validate(user_loaded),
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate user and obtain JWT tokens",
)
async def login(
    credentials: UserLogin,
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
):
    """
    Authenticates user credentials and returns JWT access and refresh tokens.
    """
    stmt = select(User).where(User.email == credentials.email).options(selectinload(User.profile))
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive.",
        )

    # Log audit event
    audit = AuditLog(
        user_id=user.id,
        action="user_login",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        event_metadata={"email": user.email},
    )
    db.add(audit)
    await db.commit()

    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserMeResponse.model_validate(user),
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token",
)
async def refresh_token(
    refresh_in: RefreshTokenRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Issues a new access and refresh token pair using a valid refresh token.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(refresh_in.refresh_token)
        if payload.get("type") != "refresh":
            raise credentials_exception
        user_id_str: str = payload.get("sub")
        if not user_id_str:
            raise credentials_exception
        user_id = uuid.UUID(user_id_str)
    except (jwt.PyJWTError, ValueError):
        raise credentials_exception from None

    stmt = select(User).where(User.id == user_id).options(selectinload(User.profile))
    user = (await db.execute(stmt)).scalar_one_or_none()

    if not user or not user.is_active:
        raise credentials_exception

    new_access_token = create_access_token(subject=user.id)
    new_refresh_token = create_refresh_token(subject=user.id)

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        user=UserMeResponse.model_validate(user),
    )


@router.get(
    "/me",
    response_model=UserMeResponse,
    summary="Get current user profile",
)
async def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Returns the authenticated user's account details and profile.
    """
    return UserMeResponse.model_validate(current_user)
