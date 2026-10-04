from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.schemas import LoginRequest, LoginResponse
from app.auth.security import create_access_token
from app.auth.service import authenticate_user
from app.core.config import settings
from app.db.database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


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