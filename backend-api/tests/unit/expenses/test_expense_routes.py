import os
from datetime import date
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://localhost/test")
os.environ.setdefault("JWT_SECRET_KEY", "1234567890abcdef1234567890abcdef")

import pytest
from fastapi.testclient import TestClient

from app.auth.dependencies import get_current_user
from app.db.database import get_db
from app.expenses import routes
from main import app


def test_get_expenses_returns_manual_and_plaid_feed_items(
	monkeypatch: pytest.MonkeyPatch,
) -> None:
	monkeypatch.setitem(
		app.dependency_overrides,
		get_current_user,
		lambda: SimpleNamespace(userid=7),
	)
	monkeypatch.setitem(app.dependency_overrides, get_db, lambda: AsyncMock())
	monkeypatch.setattr(
		routes,
		"list_expense_feed",
		AsyncMock(
			return_value=[
				{
					"source": "manual",
					"id": 1,
					"amount": Decimal("12.34"),
					"spent_on": date(2026, 5, 3),
					"merchant": "Cafe",
					"description": "Lunch",
					"categoryid": 42,
				},
				{
					"source": "plaid",
					"id": 9,
					"amount": Decimal("25.00"),
					"spent_on": date(2026, 5, 2),
					"merchant": "Market",
					"description": "CARD PURCHASE",
					"transaction_id": "transaction-123",
					"account_id": "account-456",
					"pending": False,
					"currency": "USD",
				},
			]
		),
	)

	with TestClient(app) as client:
		response = client.get("/expenses")

	assert response.status_code == 200
	assert response.json() == [
		{
			"source": "manual",
			"id": 1,
			"amount": 12.34,
			"spent_on": "2026-05-03",
			"merchant": "Cafe",
			"description": "Lunch",
			"categoryid": 42,
			"transaction_id": None,
			"account_id": None,
			"pending": None,
			"currency": None,
		},
		{
			"source": "plaid",
			"id": 9,
			"amount": 25.0,
			"spent_on": "2026-05-02",
			"merchant": "Market",
			"description": "CARD PURCHASE",
			"categoryid": None,
			"transaction_id": "transaction-123",
			"account_id": "account-456",
			"pending": False,
			"currency": "USD",
		},
	]
