from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import CurrentUser
from app.db.database import get_db
from app.plaid.schemas import SyncSummary
from app.plaid.service import sync_plaid_item

router = APIRouter()


@router.post("/items/{item_id}/sync", response_model=SyncSummary)
async def post_item_sync(
  item_id: str,
  current_user: CurrentUser,
  db: Annotated[AsyncSession, Depends(get_db)],
) -> SyncSummary:
  return await sync_plaid_item(db, item_id, current_user.userid)
