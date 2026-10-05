from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.exceptions import InvalidTokenError
from app.auth.models import User
from app.auth.security import decode_access_token
from app.db.database import get_db

# auto_error=False so we raise our own consistent 401 instead of FastAPI's default.
bearer_scheme = HTTPBearer(auto_error=False)

async def get_current_user(
  credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
  db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
  if credentials is None:
    raise InvalidTokenError()

  user_id = decode_access_token(credentials.credentials)
  if user_id is None:
    raise InvalidTokenError()

  user = await db.get(User, user_id)
  if user is None:
    raise InvalidTokenError()

  return user


CurrentUser = Annotated[User, Depends(get_current_user)]