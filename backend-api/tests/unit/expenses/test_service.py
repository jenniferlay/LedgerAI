from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.expenses.models import Category
from app.expenses.schemas import ExpenseCreate
from app.expenses.service import create_expense


@pytest.fixture
def db() -> MagicMock:
	session = MagicMock(spec=AsyncSession)
	session.commit = AsyncMock()
	session.refresh = AsyncMock()
	return session


@pytest.mark.asyncio
async def test_create_expense_persists_expense_and_category_owner(db: MagicMock) -> None:
	data = ExpenseCreate(
		categoryid=42,
		amount_dollars=12,
		amount_cents=34,
		note="Lunch",
		merchant="Cafe",
	)

	result = await create_expense(db, user_id=7, data=data)

	expected_fields = {
		"userid": 7,
		"categoryid": 42,
		"amount_dollars": 12,
		"amount_cents": 34,
		"note": "Lunch",
		"merchant": "Cafe",
	}
	assert {field: getattr(result, field) for field in expected_fields} == expected_fields

	db.add.assert_called_once_with(result)
	db.commit.assert_awaited_once_with()
	db.refresh.assert_awaited_once_with(result)


@pytest.mark.asyncio
async def test_create_expense_without_category_skips_category_owner_lookup(
	db: MagicMock,
) -> None:
	data = ExpenseCreate(
		categoryid=None,
		amount_dollars=5,
		note="Cash purchase",
	)

	result = await create_expense(db, user_id=7, data=data)

	expected_fields = {
		"userid": 7,
		"categoryid": None,
		"category_userid": None,
	}
	assert {field: getattr(result, field) for field in expected_fields} == expected_fields
	db.add.assert_called_once_with(result)
	db.commit.assert_awaited_once_with()
	db.refresh.assert_awaited_once_with(result)
