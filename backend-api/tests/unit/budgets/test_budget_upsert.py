import os
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://localhost/test")
os.environ.setdefault("JWT_SECRET_KEY", "1234567890abcdef1234567890abcdef")

import pytest
from fastapi.testclient import TestClient

from app.auth.dependencies import get_current_user
from app.budgets import routes
from app.budgets.service import BudgetHierarchyError, CategoryNotFoundError
from app.db.database import get_db
from main import app


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch):
	monkeypatch.setitem(
		app.dependency_overrides,
		get_current_user,
		lambda: SimpleNamespace(userid=7),
	)
	monkeypatch.setitem(app.dependency_overrides, get_db, lambda: AsyncMock())
	return TestClient(app)


def test_upsert_budget_success(monkeypatch: pytest.MonkeyPatch, client: TestClient):
	monkeypatch.setattr(
		routes,
		"upsert_budget",
		AsyncMock(
			return_value={
				"budgetid": 10,
				"categoryid": 2,
				"parent_categoryid": None,
				"name": "Coffee",
				"icon": "category",
				"amount": 75.0,
				"spent": 20.0,
				"remaining": 55.0,
			}
		),
	)

	response = client.post("/budgets/upsert", json={"category_name": "Coffee", "amount": 75.0})
	assert response.status_code == 200
	data = response.json()
	assert data["budgetid"] == 10
	assert data["name"] == "Coffee"
	assert data["amount"] == 75.0


def test_upsert_budget_category_not_found(monkeypatch: pytest.MonkeyPatch, client: TestClient):
	monkeypatch.setattr(
		routes,
		"upsert_budget",
		AsyncMock(side_effect=CategoryNotFoundError()),
	)

	response = client.post(
		"/budgets/upsert",
		json={"categoryid": 999, "amount": 50.0, "create_category_if_missing": False},
	)
	assert response.status_code == 404
	assert response.json()["detail"] == "Category not found"


def test_upsert_budget_hierarchy_error(monkeypatch: pytest.MonkeyPatch, client: TestClient):
	monkeypatch.setattr(
		routes,
		"upsert_budget",
		AsyncMock(side_effect=BudgetHierarchyError("Exceeds parent budget")),
	)

	response = client.post(
		"/budgets/upsert",
		json={"categoryid": 2, "amount": 500.0},
	)
	assert response.status_code == 422
	assert response.json()["detail"] == "Exceeds parent budget"


def test_upsert_budget_validation_missing_identifiers(client: TestClient):
	response = client.post("/budgets/upsert", json={"amount": 50.0})
	assert response.status_code == 422

