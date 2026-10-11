import json
from datetime import date
from decimal import Decimal
from typing import Any

import plaid
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.transactions_sync_request import TransactionsSyncRequest
from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.plaid.client import get_plaid_client
from app.plaid.models import PlaidItem, PlaidTransaction
from app.plaid.schemas import SyncSummary
from app.plaid.security import (
  decrypt_access_token,
  encrypt_access_token,
  get_access_token_cipher,
)


class PlaidApiError(RuntimeError):
  pass


class PlaidInvalidPublicTokenError(PlaidApiError):
  pass


class PlaidItemNotFoundError(LookupError):
  pass


async def create_link_token(user_id: int) -> str:
  client = get_plaid_client()
  request = LinkTokenCreateRequest(
    user=LinkTokenCreateRequestUser(client_user_id=str(user_id)),
    client_name="LedgerAI",
    products=[Products("transactions")],
    country_codes=[CountryCode("US")],
    language="en",
  )

  try:
    response = await run_in_threadpool(client.link_token_create, request)
  except plaid.ApiException as exc:
    raise PlaidApiError("Unable to create Plaid Link token") from exc

  return response.link_token


async def create_update_link_token(
  db: AsyncSession,
  user_id: int,
  item_id: str,
) -> str:
  item = await db.scalar(
    select(PlaidItem).where(
      PlaidItem.item_id == item_id,
      PlaidItem.user_id == user_id,
    )
  )
  if item is None:
    raise PlaidItemNotFoundError

  access_token = decrypt_access_token(item.access_token, get_access_token_cipher())
  request = LinkTokenCreateRequest(
    client_name="LedgerAI",
    user=LinkTokenCreateRequestUser(client_user_id=str(user_id)),
    country_codes=[CountryCode("US")],
    language="en",
    access_token=access_token,
  )
  try:
    response = await run_in_threadpool(get_plaid_client().link_token_create, request)
  except plaid.ApiException as exc:
    raise PlaidApiError("Unable to create Plaid Link update token") from exc
  return response.link_token


async def exchange_public_token(
  db: AsyncSession,
  user_id: int,
  public_token: str,
) -> str:
  cipher = get_access_token_cipher()
  client = get_plaid_client()
  request = ItemPublicTokenExchangeRequest(public_token=public_token)

  try:
    response = await run_in_threadpool(client.item_public_token_exchange, request)
  except plaid.ApiException as exc:
    if _get_error_code(exc) == "INVALID_PUBLIC_TOKEN":
      raise PlaidInvalidPublicTokenError from exc
    raise PlaidApiError("Unable to exchange Plaid public token") from exc

  encrypted_access_token = encrypt_access_token(response.access_token, cipher)
  statement = insert(PlaidItem).values(
    user_id=user_id,
    item_id=response.item_id,
    access_token=encrypted_access_token,
  )
  statement = statement.on_conflict_do_update(
    index_elements=[PlaidItem.item_id],
    set_={
      "user_id": user_id,
      "access_token": encrypted_access_token,
      "requires_reauth": False,
    },
  )
  await db.execute(statement)
  await db.commit()

  return response.item_id


async def sync_plaid_item(
  db: AsyncSession,
  item_id: str,
  user_id: int | None = None,
) -> SyncSummary:
  item_query = select(PlaidItem).where(PlaidItem.item_id == item_id)
  if user_id is not None:
    item_query = item_query.where(PlaidItem.user_id == user_id)
  item = await db.scalar(item_query)
  if item is None:
    return SyncSummary(status="not_found")
  if item.requires_reauth:
    return SyncSummary(
      status="requires_reauth",
      failure_reason="ITEM_LOGIN_REQUIRED",
    )

  lock_result = await db.execute(
    update(PlaidItem)
    .where(PlaidItem.id == item.id, PlaidItem.sync_in_progress.is_(False))
    .values(sync_in_progress=True)
    .returning(PlaidItem.id)
  )
  if lock_result.scalar_one_or_none() is None:
    return SyncSummary(status="already_syncing")
  await db.commit()

  summary = SyncSummary(status="success")
  try:
    access_token = decrypt_access_token(
      item.access_token,
      get_access_token_cipher(),
    )
    plaid_client = get_plaid_client()
    cursor = item.cursor

    while True:
      request_values: dict[str, Any] = {"access_token": access_token}
      if cursor is not None:
        request_values["cursor"] = cursor
      request = TransactionsSyncRequest(**request_values)
      try:
        response = await run_in_threadpool(plaid_client.transactions_sync, request)
      except plaid.ApiException as exc:
        error_code = _get_error_code(exc)
        if error_code in {
          "ITEM_LOGIN_REQUIRED",
          "ITEM_PERMISSION_ERROR",
          "USER_PERMISSION_REVOKED",
        }:
          await db.execute(
            update(PlaidItem)
            .where(PlaidItem.id == item.id)
            .values(requires_reauth=True)
          )
          await db.commit()
          return SyncSummary(
            status="requires_reauth",
            failure_reason=error_code,
          )
        raise PlaidApiError("Unable to sync Plaid transactions") from exc

      for transaction in response.added:
        await _upsert_transaction(db, item.id, transaction)
        summary.transactions_added += 1
      for transaction in response.modified:
        await _upsert_transaction(db, item.id, transaction)
        summary.transactions_updated += 1
      for transaction in response.removed:
        summary.transactions_removed += await _remove_transaction(
          db, item.id, transaction
        )

      cursor = response.next_cursor
      await db.execute(
        update(PlaidItem).where(PlaidItem.id == item.id).values(cursor=cursor)
      )
      await db.commit()
      if not response.has_more:
        break

    return summary
  finally:
    await db.rollback()
    await db.execute(
      update(PlaidItem)
      .where(PlaidItem.id == item.id)
      .values(sync_in_progress=False)
    )
    await db.commit()


async def _upsert_transaction(
  db: AsyncSession,
  plaid_item_id: int,
  transaction: Any,
) -> None:
  transaction_id = _transaction_value(transaction, "transaction_id")
  pending_transaction_id = _transaction_value(transaction, "pending_transaction_id")
  existing = await db.scalar(
    select(PlaidTransaction).where(
      PlaidTransaction.plaid_item_id == plaid_item_id,
      PlaidTransaction.transaction_id == transaction_id,
    )
  )

  pending = None
  if pending_transaction_id:
    pending = await db.scalar(
      select(PlaidTransaction).where(
        PlaidTransaction.plaid_item_id == plaid_item_id,
        PlaidTransaction.transaction_id == pending_transaction_id,
      )
    )

  if existing is not None and pending is not None and existing is not pending:
    await db.delete(pending)
  elif existing is None and pending is not None:
    existing = pending

  values = _transaction_values(transaction)
  if existing is None:
    db.add(PlaidTransaction(plaid_item_id=plaid_item_id, **values))
    return

  for field, value in values.items():
    setattr(existing, field, value)


async def _remove_transaction(
  db: AsyncSession,
  plaid_item_id: int,
  transaction: Any,
) -> int:
  existing = await db.scalar(
    select(PlaidTransaction).where(
      PlaidTransaction.plaid_item_id == plaid_item_id,
      PlaidTransaction.transaction_id
      == _transaction_value(transaction, "transaction_id"),
    )
  )
  if existing is None:
    return 0
  await db.delete(existing)
  return 1


def _transaction_values(transaction: Any) -> dict[str, Any]:
  raw_data = _transaction_value(transaction, "to_dict")
  if callable(raw_data):
    raw_data = raw_data()
  if raw_data is None:
    raw_data = transaction
  if not isinstance(raw_data, dict):
    raw_data = vars(raw_data)
  raw_data = json.loads(json.dumps(raw_data, default=str))

  return {
    "transaction_id": _transaction_value(transaction, "transaction_id"),
    "account_id": _transaction_value(transaction, "account_id"),
    "pending_transaction_id": _transaction_value(
      transaction, "pending_transaction_id"
    ),
    "amount": Decimal(str(_transaction_value(transaction, "amount"))),
    "transaction_date": _transaction_date(
      _transaction_value(transaction, "date")
    ),
    "authorized_date": _transaction_date(
      _transaction_value(transaction, "authorized_date")
    ),
    "name": _transaction_value(transaction, "name"),
    "merchant_name": _transaction_value(transaction, "merchant_name"),
    "pending": bool(_transaction_value(transaction, "pending")),
    "iso_currency_code": _transaction_value(transaction, "iso_currency_code"),
    "unofficial_currency_code": _transaction_value(
      transaction, "unofficial_currency_code"
    ),
    "raw_data": raw_data,
  }


def _transaction_value(transaction: Any, field: str) -> Any:
  if isinstance(transaction, dict):
    return transaction.get(field)
  return getattr(transaction, field, None)


def _transaction_date(value: Any) -> date | None:
  if value is None or isinstance(value, date):
    return value
  if isinstance(value, str):
    return date.fromisoformat(value)
  raise TypeError("Plaid transaction date has an unsupported value")


def _get_error_code(exc: plaid.ApiException) -> str | None:
  try:
    error_response = json.loads(exc.body or "{}")
  except (AttributeError, TypeError, ValueError):
    return None
  if not isinstance(error_response, dict):
    return None
  error_code = error_response.get("error_code")
  return error_code if isinstance(error_code, str) else None
