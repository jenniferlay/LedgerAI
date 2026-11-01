from datetime import date
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import plaid
from cryptography.fernet import Fernet
from sqlalchemy.dialects import postgresql

import pytest

from app.plaid import service
from app.plaid.models import PlaidItem, PlaidTransaction


def _transaction(
  transaction_id: str,
  *,
  pending_transaction_id: str | None = None,
  pending: bool = False,
) -> SimpleNamespace:
  return SimpleNamespace(
    transaction_id=transaction_id,
    account_id="account-123",
    pending_transaction_id=pending_transaction_id,
    amount=12.34,
    date=date(2026, 10, 1),
    authorized_date=None,
    name="Coffee shop",
    merchant_name="Coffee shop",
    pending=pending,
    iso_currency_code="USD",
    unofficial_currency_code=None,
    personal_finance_category=SimpleNamespace(
      primary="FOOD_AND_DRINK",
      detailed="FOOD_AND_DRINK_COFFEE",
    ),
  )


def _session(
  *,
  item: PlaidItem,
  scalar_results: list[object],
) -> AsyncMock:
  db = AsyncMock()
  db.add = MagicMock()
  db.scalar = AsyncMock(side_effect=[item, *scalar_results])
  lock_result = MagicMock()
  lock_result.scalar_one_or_none.return_value = item.id
  db.execute = AsyncMock(return_value=lock_result)
  return db


@pytest.mark.asyncio
async def test_sync_plaid_item_fetches_all_pages_and_persists_cursor(
  monkeypatch: pytest.MonkeyPatch,
) -> None:
  cipher = Fernet.generate_key()
  item = PlaidItem(
    id=8,
    user_id=42,
    item_id="item-123",
    access_token=Fernet(cipher).encrypt(b"access-secret").decode("ascii"),
    cursor=None,
  )
  added = _transaction("transaction-added")
  modified = _transaction("transaction-modified")
  first_page = SimpleNamespace(
    added=[added],
    modified=[],
    removed=[],
    next_cursor="cursor-1",
    has_more=True,
  )
  second_page = SimpleNamespace(
    added=[],
    modified=[modified],
    removed=[],
    next_cursor="cursor-2",
    has_more=False,
  )
  plaid_client = MagicMock()
  plaid_client.transactions_sync.side_effect = [first_page, second_page]
  db = _session(item=item, scalar_results=[None, None])
  monkeypatch.setattr(service, "get_access_token_cipher", lambda: Fernet(cipher))
  monkeypatch.setattr(service, "get_plaid_client", lambda: plaid_client)

  summary = await service.sync_plaid_item(db, "item-123", user_id=42)

  assert summary.model_dump() == {
    "accounts_imported": 0,
    "transactions_added": 1,
    "transactions_updated": 1,
    "transactions_removed": 0,
    "status": "success",
    "failure_reason": None,
  }
  assert plaid_client.transactions_sync.call_count == 2
  requests = [
    call.args[0] for call in plaid_client.transactions_sync.call_args_list
  ]
  assert requests[0].access_token == "access-secret"
  assert requests[0].options.include_personal_finance_category is True
  version = requests[0].options.personal_finance_category_version
  assert getattr(version, "value", version) == "v2"
  assert "cursor" not in requests[0]
  assert requests[1].cursor == "cursor-1"
  upserts = [
    call.args[0]
    for call in db.execute.await_args_list
    if "ON CONFLICT"
    in str(call.args[0].compile(dialect=postgresql.dialect()).string)
  ]
  assert len(upserts) == 2
  upsert_sql = str(upserts[0].compile(dialect=postgresql.dialect()))
  assert "plaid_category_detailed" in upsert_sql
  assert "user_merchant" not in upsert_sql
  assert "user_note" not in upsert_sql
  assert "hidden" not in upsert_sql
  assert db.commit.await_count == 4


@pytest.mark.asyncio
async def test_sync_plaid_item_replaces_pending_transaction(
  monkeypatch: pytest.MonkeyPatch,
) -> None:
  cipher = Fernet.generate_key()
  item = PlaidItem(
    id=9,
    user_id=42,
    item_id="item-123",
    access_token=Fernet(cipher).encrypt(b"access-secret").decode("ascii"),
    cursor="cursor-0",
  )
  pending = PlaidTransaction(
    id=100,
    plaid_item_id=item.id,
    transaction_id="pending-transaction",
    account_id="account-123",
    amount=12.34,
    transaction_date=date(2026, 9, 30),
    name="Pending coffee",
    pending=True,
  )
  posted = _transaction(
    "posted-transaction",
    pending_transaction_id="pending-transaction",
  )
  plaid_client = MagicMock()
  plaid_client.transactions_sync.return_value = SimpleNamespace(
    added=[posted],
    modified=[],
    removed=[],
    next_cursor="cursor-1",
    has_more=False,
  )
  db = _session(item=item, scalar_results=[])
  monkeypatch.setattr(service, "get_access_token_cipher", lambda: Fernet(cipher))
  monkeypatch.setattr(service, "get_plaid_client", lambda: plaid_client)

  summary = await service.sync_plaid_item(db, "item-123")

  assert summary.transactions_added == 1
  statements = [call.args[0] for call in db.execute.await_args_list]
  pending_rename = next(
    statement for statement in statements
    if "UPDATE plaid_transactions"
    in str(statement.compile(dialect=postgresql.dialect()))
  )
  assert "NOT (EXISTS" in str(
    pending_rename.compile(dialect=postgresql.dialect())
  ).upper()
  upsert = next(
    statement for statement in statements
    if "ON CONFLICT"
    in str(statement.compile(dialect=postgresql.dialect()).string)
  )
  assert "ON CONFLICT ON CONSTRAINT uq_plaid_transactions_item_transaction" in str(
    upsert.compile(dialect=postgresql.dialect())
  )
  assert pending.transaction_id == "pending-transaction"


def test_transaction_values_keep_plaid_sign_and_detailed_category() -> None:
  values = service._transaction_values(_transaction("transaction-123"))

  assert values["amount"] == Decimal("12.34")
  assert values["plaid_category_detailed"] == "FOOD_AND_DRINK_COFFEE"


@pytest.mark.asyncio
async def test_sync_plaid_item_marks_reauthentication_required(
  monkeypatch: pytest.MonkeyPatch,
) -> None:
  cipher = Fernet.generate_key()
  item = PlaidItem(
    id=10,
    user_id=42,
    item_id="item-123",
    access_token=Fernet(cipher).encrypt(b"access-secret").decode("ascii"),
  )
  api_error = plaid.ApiException()
  api_error.body = '{"error_code":"ITEM_LOGIN_REQUIRED"}'
  plaid_client = MagicMock()
  plaid_client.transactions_sync.side_effect = api_error
  db = _session(item=item, scalar_results=[])
  monkeypatch.setattr(service, "get_access_token_cipher", lambda: Fernet(cipher))
  monkeypatch.setattr(service, "get_plaid_client", lambda: plaid_client)

  summary = await service.sync_plaid_item(db, "item-123")

  assert summary.status == "requires_reauth"
  assert summary.failure_reason == "ITEM_LOGIN_REQUIRED"
  assert db.commit.await_count == 3
  update_statements = [
    call.args[0] for call in db.execute.await_args_list
  ]
  assert any(
    statement.compile().params.get("requires_reauth") is True
    for statement in update_statements
  )
