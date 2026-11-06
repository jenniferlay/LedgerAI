from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import CurrentUser, bearer_scheme
from app.chat.schemas import ChatRequest, ChatResponse
from app.chat.service import generate_chat_response
from app.db.database import get_db

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat_with_marty(
  body: ChatRequest,
  current_user: CurrentUser,
  credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
  db: Annotated[AsyncSession, Depends(get_db)],
) -> ChatResponse:
  token = credentials.credentials if credentials else None
  return await generate_chat_response(
    db=db,
    user_id=current_user.userid,
    message=body.message,
    history=body.history,
    access_token=token,
  )
