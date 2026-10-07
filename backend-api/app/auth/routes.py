from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.schemas import LoginRequest, LoginResponse, SignupRequest, SignupResponse
from app.auth.security import create_access_token
from app.auth.service import authenticate_user, create_user
from app.core.config import settings
from app.db.database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=SignupResponse)
async def signup(
    user_data: SignupRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SignupResponse:
    await create_user(db, user_data.email, user_data.username, user_data.password)
    return SignupResponse(success=True, message="User created successfully")


@router.post("/login", response_model=LoginResponse)
async def login(
    credentials: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> LoginResponse:
    user = await authenticate_user(db, credentials.email, credentials.password)
    return LoginResponse(
        access_token=create_access_token(user.userid),
        expires_in=settings.access_token_expire_minutes * 60,
    )