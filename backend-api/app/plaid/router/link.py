from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import CurrentUser
from app.db.database import get_db
from app.plaid.schemas import (
  LinkTokenResponse,
  PublicTokenExchangeRequest,
  PublicTokenExchangeResponse,
  SyncSummary,
)
from app.plaid.security import (
  PlaidAccessTokenDecryptionError,
  PlaidEncryptionConfigurationError,
)
from app.plaid.service import (
  PlaidApiError,
  create_link_token,
  exchange_public_token,
  sync_plaid_item,
)
from app.plaid.client import PlaidConfigurationError

router = APIRouter()

_FAILURE_REASONS: dict[type[Exception], str] = {
  PlaidAccessTokenDecryptionError: "ACCESS_TOKEN_DECRYPTION_ERROR",
  PlaidEncryptionConfigurationError: "ENCRYPTION_CONFIGURATION_ERROR",
  PlaidConfigurationError: "PLAID_CONFIGURATION_ERROR",
  PlaidApiError: "PLAID_API_ERROR",
}


@router.post("/link-token", response_model=LinkTokenResponse)
async def post_link_token(current_user: CurrentUser) -> LinkTokenResponse:
  link_token = await create_link_token(current_user.userid)
  return LinkTokenResponse(link_token=link_token)


@router.post("/exchange", response_model=PublicTokenExchangeResponse)
async def post_public_token_exchange(
  exchange_data: PublicTokenExchangeRequest,
  current_user: CurrentUser,
  db: Annotated[AsyncSession, Depends(get_db)],
) -> PublicTokenExchangeResponse:
  item_id = await exchange_public_token(
    db,
    current_user.userid,
    exchange_data.public_token,
  )

  try:
    sync_summary = await sync_plaid_item(db, item_id, current_user.userid)
  except (
    PlaidAccessTokenDecryptionError,
    PlaidEncryptionConfigurationError,
    PlaidConfigurationError,
    PlaidApiError,
  ) as exc:
    sync_summary = SyncSummary(
      status="failed",
      failure_reason=next(
        reason
        for exception_type, reason in _FAILURE_REASONS.items()
        if isinstance(exc, exception_type)
      ),
    )

  return PublicTokenExchangeResponse(
    item_id=item_id,
    sync_summary=sync_summary,
  )
