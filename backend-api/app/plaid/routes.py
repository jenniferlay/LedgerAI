from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import CurrentUser
from app.db.database import get_db
from app.plaid.client import PlaidConfigurationError
from app.plaid.schemas import (
  LinkTokenResponse,
  PublicTokenExchangeRequest,
  PublicTokenExchangeResponse,
)
from app.plaid.service import (
  PlaidApiError,
  PlaidInvalidPublicTokenError,
  create_link_token,
  exchange_public_token,
)
from app.plaid.security import (
  PlaidEncryptionConfigurationError,
)

router = APIRouter(prefix="/plaid", tags=["plaid"])


@router.post("/link-token", response_model=LinkTokenResponse)
async def post_link_token(current_user: CurrentUser) -> LinkTokenResponse:
  try:
    link_token = await create_link_token(current_user.userid)
  except PlaidConfigurationError as exc:
    raise HTTPException(
      status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
      detail="Plaid is not configured",
    ) from exc
  except PlaidApiError as exc:
    raise HTTPException(
      status_code=status.HTTP_502_BAD_GATEWAY,
      detail="Unable to create Plaid Link token",
    ) from exc

  return LinkTokenResponse(link_token=link_token)


@router.post("/exchange", response_model=PublicTokenExchangeResponse)
async def post_public_token_exchange(
  exchange_data: PublicTokenExchangeRequest,
  current_user: CurrentUser,
  db: Annotated[AsyncSession, Depends(get_db)],
) -> PublicTokenExchangeResponse:
  try:
    item_id = await exchange_public_token(
      db,
      current_user.userid,
      exchange_data.public_token,
    )
  except PlaidEncryptionConfigurationError as exc:
    raise HTTPException(
      status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
      detail="Plaid access-token encryption is not configured",
    ) from exc
  except PlaidConfigurationError as exc:
    raise HTTPException(
      status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
      detail="Plaid is not configured",
    ) from exc
  except PlaidInvalidPublicTokenError as exc:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="The Plaid public token is invalid or expired",
    ) from exc
  except PlaidApiError as exc:
    raise HTTPException(
      status_code=status.HTTP_502_BAD_GATEWAY,
      detail="Unable to exchange Plaid public token",
    ) from exc

  return PublicTokenExchangeResponse(item_id=item_id)
