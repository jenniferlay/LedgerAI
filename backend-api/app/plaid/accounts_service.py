from decimal import Decimal

from plaid.model.item_remove_request import ItemRemoveRequest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.expenses.models import Expense
from app.plaid.client import get_plaid_client
from app.plaid.models import PlaidAccount, PlaidItem
from app.plaid.schemas import NetWorthResponse, PlaidAccountResponse
from app.plaid.security import decrypt_access_token, get_access_token_cipher
from app.plaid.service import PlaidItemNotFoundError


class PlaidAccountNotFoundError(LookupError):
  pass


async def get_user_accounts(
  db: AsyncSession,
  user_id: int,
) -> list[PlaidAccountResponse]:
  statement = (
    select(PlaidAccount, PlaidItem.item_id)
    .join(PlaidItem, PlaidAccount.plaid_item_id == PlaidItem.id)
    .where(PlaidItem.user_id == user_id)
    .order_by(PlaidAccount.type.asc(), PlaidAccount.name.asc())
  )
  results = await db.execute(statement)

  accounts: list[PlaidAccountResponse] = []
  for account, item_id in results.all():
    accounts.append(
      PlaidAccountResponse(
        id=account.id,
        item_id=item_id,
        account_id=account.account_id,
        name=account.name,
        official_name=account.official_name,
        type=account.type,
        subtype=account.subtype,
        mask=account.mask,
        current_balance=(
          float(account.current_balance) if account.current_balance is not None else None
        ),
        available_balance=(
          float(account.available_balance)
          if account.available_balance is not None
          else None
        ),
        credit_limit=(
          float(account.credit_limit) if account.credit_limit is not None else None
        ),
        iso_currency_code=account.iso_currency_code or "USD",
        is_active=account.is_active,
      )
    )

  manual_statement = select(
    func.coalesce(func.sum(-Expense.amount), Decimal("0.00"))
  ).where(Expense.userid == user_id)
  raw_manual_cash = await db.scalar(manual_statement)
  manual_cash = (
    Decimal(str(raw_manual_cash))
    if isinstance(raw_manual_cash, (Decimal, int, float))
    else Decimal("0.00")
  )

  accounts.append(
    PlaidAccountResponse(
      id=0,
      item_id="manual",
      account_id="manual-cash",
      name="Cash Wallet",
      official_name="Physical Cash & Manual Wallet",
      type="depository",
      subtype="cash",
      mask=None,
      current_balance=float(manual_cash),
      available_balance=float(manual_cash),
      credit_limit=None,
      iso_currency_code="USD",
      is_active=True,
    )
  )

  return accounts


async def compute_net_worth(
  db: AsyncSession,
  user_id: int,
) -> NetWorthResponse:
  statement = (
    select(PlaidAccount)
    .join(PlaidItem, PlaidAccount.plaid_item_id == PlaidItem.id)
    .where(
      PlaidItem.user_id == user_id,
      PlaidAccount.is_active.is_(True),
    )
  )
  accounts = (await db.scalars(statement)).all()

  total_assets = Decimal("0.00")
  total_liabilities = Decimal("0.00")
  depository_total = Decimal("0.00")
  credit_total = Decimal("0.00")

  for acc in accounts:
    bal = acc.current_balance or Decimal("0.00")
    acc_type = (acc.type or "").lower()

    if acc_type in {"depository", "investment"}:
      total_assets += bal
      if acc_type == "depository":
        depository_total += bal
    elif acc_type in {"credit", "loan"}:
      total_liabilities += bal
      if acc_type == "credit":
        credit_total += bal
    else:
      if bal >= 0:
        total_assets += bal
      else:
        total_liabilities += abs(bal)

  manual_statement = select(
    func.coalesce(func.sum(-Expense.amount), Decimal("0.00"))
  ).where(Expense.userid == user_id)
  raw_manual_cash = await db.scalar(manual_statement)
  if isinstance(raw_manual_cash, (Decimal, int, float)):
    manual_cash = Decimal(str(raw_manual_cash))
  else:
    manual_cash = Decimal("0.00")

  if manual_cash >= 0:
    total_assets += manual_cash
    depository_total += manual_cash
  else:
    total_liabilities += abs(manual_cash)

  net_worth = total_assets - total_liabilities

  return NetWorthResponse(
    net_worth=float(net_worth),
    total_assets=float(total_assets),
    total_liabilities=float(total_liabilities),
    depository_total=float(depository_total),
    credit_total=float(credit_total),
    manual_cash=float(manual_cash),
    currency="USD",
    account_count=len(accounts) + 1,
  )


async def set_account_active_status(
  db: AsyncSession,
  user_id: int,
  account_id: str,
  is_active: bool,
) -> PlaidAccountResponse:
  if account_id == "manual-cash":
    manual_statement = select(
      func.coalesce(func.sum(-Expense.amount), Decimal("0.00"))
    ).where(Expense.userid == user_id)
    raw_manual_cash = await db.scalar(manual_statement)
    manual_cash = (
      Decimal(str(raw_manual_cash))
      if isinstance(raw_manual_cash, (Decimal, int, float))
      else Decimal("0.00")
    )
    return PlaidAccountResponse(
      id=0,
      item_id="manual",
      account_id="manual-cash",
      name="Cash Wallet",
      official_name="Physical Cash & Manual Wallet",
      type="depository",
      subtype="cash",
      mask=None,
      current_balance=float(manual_cash),
      available_balance=float(manual_cash),
      credit_limit=None,
      iso_currency_code="USD",
      is_active=is_active,
    )

  statement = (
    select(PlaidAccount, PlaidItem.item_id)
    .join(PlaidItem, PlaidAccount.plaid_item_id == PlaidItem.id)
    .where(
      PlaidAccount.account_id == account_id,
      PlaidItem.user_id == user_id,
    )
  )
  result = (await db.execute(statement)).first()
  if not result:
    raise PlaidAccountNotFoundError("Account not found")

  account, item_id = result
  account.is_active = is_active
  await db.commit()
  await db.refresh(account)

  return PlaidAccountResponse(
    id=account.id,
    item_id=item_id,
    account_id=account.account_id,
    name=account.name,
    official_name=account.official_name,
    type=account.type,
    subtype=account.subtype,
    mask=account.mask,
    current_balance=(
      float(account.current_balance) if account.current_balance is not None else None
    ),
    available_balance=(
      float(account.available_balance)
      if account.available_balance is not None
      else None
    ),
    credit_limit=(
      float(account.credit_limit) if account.credit_limit is not None else None
    ),
    iso_currency_code=account.iso_currency_code or "USD",
    is_active=account.is_active,
  )


async def disconnect_plaid_item(
  db: AsyncSession,
  user_id: int,
  item_id: str,
) -> None:
  statement = select(PlaidItem).where(
    PlaidItem.item_id == item_id,
    PlaidItem.user_id == user_id,
  )
  item = await db.scalar(statement)
  if not item:
    raise PlaidItemNotFoundError("Plaid item not found")

  try:
    access_token = decrypt_access_token(item.access_token, get_access_token_cipher())
    client = get_plaid_client()
    request = ItemRemoveRequest(access_token=access_token)
    await run_in_threadpool(client.item_remove, request)
  except Exception:
    pass

  await db.delete(item)
  await db.commit()
