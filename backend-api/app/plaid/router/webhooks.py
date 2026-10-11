from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.plaid.schemas import PlaidWebhookRequest, SyncSummary
from app.plaid.security import verify_plaid_webhook
from app.plaid.service import sync_plaid_item

router = APIRouter(dependencies=[Depends(verify_plaid_webhook)])


@router.post("/webhooks", response_model=SyncSummary)
async def post_plaid_webhook(
  webhook: PlaidWebhookRequest,
  db: Annotated[AsyncSession, Depends(get_db)],
) -> SyncSummary:
  if (
    webhook.webhook_type != "TRANSACTIONS"
    or webhook.webhook_code != "SYNC_UPDATES_AVAILABLE"
  ):
    return SyncSummary(status="ignored")

  return await sync_plaid_item(db, webhook.item_id)
