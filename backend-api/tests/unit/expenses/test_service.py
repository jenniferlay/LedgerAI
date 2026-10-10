from datetime import date
from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.asyncio import AsyncSession

from app.expenses.models import Category, Expense
from app.expenses.schemas import ExpenseCreate
from app.expenses.service import create_expense, list_categories, list_expenses


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


@pytest.mark.asyncio
async def test_list_categories_includes_only_global_and_user_categories(
	db: MagicMock,
) -> None:
	categories = [
		Category(categoryid=1, userid=0, parent_categoryid=None, name="Food"),
		Category(categoryid=2, userid=7, parent_categoryid=1, name="Coffee"),
	]
	scalars = MagicMock()
	scalars.all.return_value = categories
	db.scalars = AsyncMock(return_value=scalars)

	result = await list_categories(db, user_id=7)

	assert result == categories
	statement = db.scalars.await_args.args[0]
	compiled = statement.compile(dialect=postgresql.dialect())
	assert "categories.userid IN" in str(compiled)
	assert compiled.params["userid_1"] == [0, 7]


@pytest.mark.asyncio
async def test_list_expenses_scopes_and_filters_results(db: MagicMock) -> None:
	expense = Expense(
		expenseid=1,
		userid=7,
		categoryid=42,
		amount_dollars=12,
		amount_cents=34,
		note="Lunch",
		merchant="Cafe",
		spent_on=date(2026, 5, 3),
	)
	scalars = MagicMock()
	scalars.all.return_value = [expense]
	db.scalars = AsyncMock(return_value=scalars)

	result = await list_expenses(
		db,
		user_id=7,
		start_date=date(2026, 5, 1),
		end_date=date(2026, 5, 31),
		categoryid=42,
		merchant="Cafe",
		limit=25,
		offset=10,
	)

	assert result == [expense]
	db.scalars.assert_awaited_once()
	statement = db.scalars.await_args.args[0]
	compiled = statement.compile(dialect=postgresql.dialect())

	assert "expenses.userid =" in str(compiled)
	assert "expenses.spent_on >=" in str(compiled)
	assert "expenses.spent_on <=" in str(compiled)
	assert "expenses.categoryid =" in str(compiled)
	assert "expenses.merchant ILIKE" in str(compiled)
	assert "ORDER BY expenses.spent_on DESC, expenses.expenseid DESC" in str(compiled)
	assert compiled.params["userid_1"] == 7
	assert compiled.params["categoryid_1"] == 42
	assert 25 in compiled.params.values()
	assert 10 in compiled.params.values()


@pytest.mark.asyncio
async def test_list_expenses_escapes_merchant_search_wildcards(db: MagicMock) -> None:
	scalars = MagicMock()
	scalars.all.return_value = []
	db.scalars = AsyncMock(return_value=scalars)

	await list_expenses(db, user_id=7, merchant="50%_ off")

	statement = db.scalars.await_args.args[0]
	compiled = statement.compile(dialect=postgresql.dialect())
	assert compiled.params["merchant_1"] == "%50\\%\\_ off%"
