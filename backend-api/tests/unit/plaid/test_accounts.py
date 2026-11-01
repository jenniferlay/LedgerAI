from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from app.auth.dependencies import get_current_user
from app.db.database import get_db
from app.plaid.models import PlaidAccount, PlaidItem
from main import app


@pytest.fixture
def client() -> TestClient:
  app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(userid=42)
  with TestClient(app) as test_client:
    yield test_client
  app.dependency_overrides.pop(get_current_user, None)
  app.dependency_overrides.pop(get_db, None)


def test_get_accounts_returns_linked_accounts(client: TestClient) -> None:
  account_depository = PlaidAccount(
    id=1,
    plaid_item_id=10,
    account_id="acc-check-123",
    name="Total Checking",
    official_name="Chase Total Checking",
    type="depository",
    subtype="checking",
    mask="1234",
    current_balance=Decimal("2500.50"),
    available_balance=Decimal("2400.00"),
    credit_limit=None,
    iso_currency_code="USD",
    is_active=True,
  )
  account_credit = PlaidAccount(
    id=2,
    plaid_item_id=10,
    account_id="acc-credit-456",
    name="Freedom Unlimited",
    official_name="Chase Freedom",
    type="credit",
    subtype="credit card",
    mask="5678",
    current_balance=Decimal("450.25"),
    available_balance=Decimal("4549.75"),
    credit_limit=Decimal("5000.00"),
    iso_currency_code="USD",
    is_active=True,
  )

  db = AsyncMock()
  result_mock = MagicMock()
  result_mock.all.return_value = [
    (account_credit, "item-chase-1"),
    (account_depository, "item-chase-1"),
  ]
  db.execute = AsyncMock(return_value=result_mock)
  app.dependency_overrides[get_db] = lambda: db

  response = client.get("/plaid/accounts")
  assert response.status_code == 200
  data = response.json()
  assert len(data) == 3
  assert data[0]["account_id"] == "acc-credit-456"
  assert data[0]["type"] == "credit"
  assert data[0]["subtype"] == "credit card"
  assert data[0]["current_balance"] == 450.25
  assert data[0]["credit_limit"] == 5000.00

  assert data[1]["account_id"] == "acc-check-123"
  assert data[1]["type"] == "depository"
  assert data[1]["subtype"] == "checking"
  assert data[1]["current_balance"] == 2500.50

  assert data[2]["account_id"] == "manual-cash"
  assert data[2]["name"] == "Cash Wallet"
  assert data[2]["type"] == "depository"
  assert data[2]["subtype"] == "cash"


def test_get_net_worth_computes_assets_minus_liabilities(client: TestClient) -> None:
  checking = PlaidAccount(
    id=1,
    plaid_item_id=10,
    account_id="acc-1",
    name="Checking",
    type="depository",
    subtype="checking",
    current_balance=Decimal("1500.00"),
    is_active=True,
  )
  savings = PlaidAccount(
    id=2,
    plaid_item_id=10,
    account_id="acc-2",
    name="Savings",
    type="depository",
    subtype="savings",
    current_balance=Decimal("8500.00"),
    is_active=True,
  )
  credit_card = PlaidAccount(
    id=3,
    plaid_item_id=10,
    account_id="acc-3",
    name="Sapphire Reserve",
    type="credit",
    subtype="credit card",
    current_balance=Decimal("2000.00"),
    is_active=True,
  )

  db = AsyncMock()
  scalars_mock = MagicMock()
  scalars_mock.all.return_value = [checking, savings, credit_card]
  db.scalars = AsyncMock(return_value=scalars_mock)
  app.dependency_overrides[get_db] = lambda: db

  response = client.get("/plaid/accounts/net-worth")
  assert response.status_code == 200
  data = response.json()
  # Total Assets = 1500 + 8500 = 10000
  # Total Liabilities = 2000
  # Net Worth = 10000 - 2000 = 8000
  assert data["total_assets"] == 10000.0
  assert data["total_liabilities"] == 2000.0
  assert data["net_worth"] == 8000.0
  assert data["depository_total"] == 10000.0
  assert data["credit_total"] == 2000.0
  assert data["account_count"] == 4


def test_update_account_status_toggles_active(client: TestClient) -> None:
  account = PlaidAccount(
    id=1,
    plaid_item_id=10,
    account_id="acc-toggle-1",
    name="Vault Savings",
    type="depository",
    subtype="savings",
    current_balance=Decimal("50000.00"),
    is_active=True,
  )

  db = AsyncMock()
  result_mock = MagicMock()
  result_mock.first.return_value = (account, "item-123")
  db.execute = AsyncMock(return_value=result_mock)
  db.commit = AsyncMock()
  db.refresh = AsyncMock()
  app.dependency_overrides[get_db] = lambda: db

  response = client.patch(
    "/plaid/accounts/acc-toggle-1",
    json={"is_active": False},
  )
  assert response.status_code == 200
  data = response.json()
  assert data["account_id"] == "acc-toggle-1"
  assert data["is_active"] is False
  assert account.is_active is False
  assert db.commit.await_count == 1


def test_disconnect_item_deletes_item(client: TestClient) -> None:
  item = PlaidItem(
    id=10,
    user_id=42,
    item_id="item-to-delete",
    access_token="encrypted-token",
  )

  db = AsyncMock()
  db.scalar = AsyncMock(return_value=item)
  db.delete = AsyncMock()
  db.commit = AsyncMock()
  app.dependency_overrides[get_db] = lambda: db

  response = client.delete("/plaid/items/item-to-delete")
  assert response.status_code == 200
  assert response.json() == {"message": "Institution disconnected successfully"}
  db.delete.assert_awaited_once_with(item)
  assert db.commit.await_count == 1


def test_update_account_status_not_found(client: TestClient) -> None:
  db = AsyncMock()
  result_mock = MagicMock()
  result_mock.first.return_value = None
  db.execute = AsyncMock(return_value=result_mock)
  app.dependency_overrides[get_db] = lambda: db

  response = client.patch(
    "/plaid/accounts/non-existent",
    json={"is_active": False},
  )
  assert response.status_code == 404
  assert response.json() == {"detail": "Account not found"}


def test_disconnect_item_not_found(client: TestClient) -> None:
  db = AsyncMock()
  db.scalar = AsyncMock(return_value=None)
  app.dependency_overrides[get_db] = lambda: db

  response = client.delete("/plaid/items/non-existent")
  assert response.status_code == 404
  assert response.json() == {"detail": "Plaid item not found"}


def test_get_net_worth_includes_manual_income_and_expenses(client: TestClient) -> None:
  db = AsyncMock()
  scalars_mock = MagicMock()
  scalars_mock.all.return_value = []
  db.scalars = AsyncMock(return_value=scalars_mock)
  # manual_cash = +$1250.00 (e.g. $1500 income minus $250 expenses)
  db.scalar = AsyncMock(return_value=Decimal("1250.00"))
  app.dependency_overrides[get_db] = lambda: db

  response = client.get("/plaid/accounts/net-worth")
  assert response.status_code == 200
  data = response.json()
  assert data["manual_cash"] == 1250.0
  assert data["total_assets"] == 1250.0
  assert data["total_liabilities"] == 0.0
  assert data["net_worth"] == 1250.0
  assert data["account_count"] == 1
