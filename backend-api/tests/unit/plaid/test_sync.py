from datetime import date
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import plaid
from cryptography.fernet import Fernet

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
  assert "cursor" not in requests[0]
  assert requests[1].cursor == "cursor-1"
  assert db.add.call_count == 2
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
    raw_data={},
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
  db = _session(item=item, scalar_results=[None, pending])
  monkeypatch.setattr(service, "get_access_token_cipher", lambda: Fernet(cipher))
  monkeypatch.setattr(service, "get_plaid_client", lambda: plaid_client)

  summary = await service.sync_plaid_item(db, "item-123")

  assert summary.transactions_added == 1
  assert pending.transaction_id == "posted-transaction"
  assert pending.pending_transaction_id == "pending-transaction"
  assert pending.pending is False
  db.add.assert_not_called()
  db.delete.assert_not_awaited()


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
