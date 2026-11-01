from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import CurrentUser
from app.db.database import get_db
from app.plaid.accounts_service import (
  PlaidAccountNotFoundError,
  compute_net_worth,
  disconnect_plaid_item,
  get_user_accounts,
  set_account_active_status,
)
from app.plaid.schemas import AccountUpdate, NetWorthResponse, PlaidAccountResponse
from app.plaid.service import PlaidItemNotFoundError

router = APIRouter()


@router.get("/accounts", response_model=list[PlaidAccountResponse])
async def get_accounts(
  current_user: CurrentUser,
  db: Annotated[AsyncSession, Depends(get_db)],
) -> list[PlaidAccountResponse]:
  return await get_user_accounts(db, current_user.userid)


@router.get("/accounts/net-worth", response_model=NetWorthResponse)
async def get_net_worth(
  current_user: CurrentUser,
  db: Annotated[AsyncSession, Depends(get_db)],
) -> NetWorthResponse:
  return await compute_net_worth(db, current_user.userid)


@router.patch("/accounts/{account_id}", response_model=PlaidAccountResponse)
async def update_account_status(
  account_id: str,
  payload: AccountUpdate,
  current_user: CurrentUser,
  db: Annotated[AsyncSession, Depends(get_db)],
) -> PlaidAccountResponse:
  try:
    return await set_account_active_status(
      db,
      current_user.userid,
      account_id,
      payload.is_active,
    )
  except PlaidAccountNotFoundError:
    raise HTTPException(
      status_code=status.HTTP_404_NOT_FOUND,
      detail="Account not found",
    )


@router.delete("/items/{item_id}", status_code=status.HTTP_200_OK)
async def delete_item(
  item_id: str,
  current_user: CurrentUser,
  db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, str]:
  try:
    await disconnect_plaid_item(db, current_user.userid, item_id)
  except PlaidItemNotFoundError:
    raise HTTPException(
      status_code=status.HTTP_404_NOT_FOUND,
      detail="Plaid item not found",
    )
  return {"message": "Institution disconnected successfully"}
