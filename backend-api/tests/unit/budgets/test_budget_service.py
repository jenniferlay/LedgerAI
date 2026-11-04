from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy.exc import IntegrityError

from app.budgets.models import Budget
from app.budgets.schemas import BudgetCreate, BudgetUpdate, BudgetUpsert
from app.budgets.service import (
	BudgetExistsError,
	BudgetHierarchyError,
	CategoryNotFoundError,
	create_budget,
	delete_budget,
	update_budget,
	upsert_budget,
)
from app.budgets.service.hierarchy import _enforce_hierarchy, _money
from app.budgets.service.spend import _month_bounds
from app.category.models import Category


def test_money_formatter():
	assert _money(Decimal("123.45")) == "$123.45"
	assert _money(Decimal("1000")) == "$1,000.00"
	assert _money(Decimal("0")) == "$0.00"


def test_month_bounds_december_rollover():
	start, next_start = _month_bounds(date(2025, 12, 15))
	assert start == date(2025, 12, 1)
	assert next_start == date(2026, 1, 1)


def test_month_bounds_regular_month():
	start, next_start = _month_bounds(date(2026, 4, 10))
	assert start == date(2026, 4, 1)
	assert next_start == date(2026, 5, 1)


@pytest.mark.asyncio
async def test_enforce_hierarchy_subcategory_exceeds_parent():
	db = MagicMock()
	db.scalar = AsyncMock(side_effect=[
		Decimal("100.00"),  # parent_amount
		Decimal("80.00"),   # siblings total
	])
	db.rollback = AsyncMock()

	child_category = Category(
		categoryid=10,
		userid=7,
		parent_categoryid=1,
		name="Fast Food",
	)

	with pytest.raises(BudgetHierarchyError) as exc_info:
		await _enforce_hierarchy(db, user_id=7, category=child_category, amount=Decimal("30.00"))

	assert "Subcategory budgets would total $110.00, which exceeds the parent budget of $100.00" in str(exc_info.value)
	db.rollback.assert_awaited_once()


@pytest.mark.asyncio
async def test_enforce_hierarchy_parent_less_than_children():
	db = MagicMock()
	# Not a child, so only parent check runs
	db.scalar = AsyncMock(return_value=Decimal("150.00"))  # children total
	db.rollback = AsyncMock()

	parent_category = Category(
		categoryid=1,
		userid=7,
		parent_categoryid=None,
		name="Food & Dining",
	)

	with pytest.raises(BudgetHierarchyError) as exc_info:
		await _enforce_hierarchy(db, user_id=7, category=parent_category, amount=Decimal("100.00"))

	assert "Budget must be at least $150.00, the total of its subcategory budgets" in str(exc_info.value)
	db.rollback.assert_awaited_once()


@pytest.mark.asyncio
async def test_create_budget_category_not_found():
	db = MagicMock()
	db.execute = AsyncMock()
	db.scalar = AsyncMock(return_value=None)
	db.rollback = AsyncMock()

	with pytest.raises(CategoryNotFoundError):
		await create_budget(db, user_id=7, data=BudgetCreate(categoryid=999, amount=Decimal("50.00")))

	db.rollback.assert_awaited_once()


@pytest.mark.asyncio
async def test_create_budget_already_exists():
	db = MagicMock()
	category = Category(categoryid=2, userid=7, parent_categoryid=None, name="Groceries")
	db.execute = AsyncMock()
	db.scalar = AsyncMock(side_effect=[category, Decimal("0.00")])
	db.add = MagicMock()
	db.flush = AsyncMock(side_effect=IntegrityError("unique constraint", params=None, orig=Exception()))
	db.rollback = AsyncMock()

	with pytest.raises(BudgetExistsError):
		await create_budget(db, user_id=7, data=BudgetCreate(categoryid=2, amount=Decimal("100.00")))

	db.rollback.assert_awaited_once()


@pytest.mark.asyncio
async def test_delete_budget_atomic_success():
	db = MagicMock()
	db.execute = AsyncMock()
	result = MagicMock()
	result.rowcount = 1
	# First execute is advisory lock, second execute is atomic delete
	db.execute.side_effect = [MagicMock(), result]
	db.commit = AsyncMock()

	deleted = await delete_budget(db, user_id=7, budgetid=15)
	assert deleted is True
	db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_delete_budget_atomic_not_found():
	db = MagicMock()
	result = MagicMock()
	result.rowcount = 0
	db.execute = AsyncMock(side_effect=[MagicMock(), result])
	db.rollback = AsyncMock()

	deleted = await delete_budget(db, user_id=7, budgetid=999)
	assert deleted is False
	db.rollback.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_budget_not_found():
	db = MagicMock()
	db.execute = AsyncMock()
	db.scalar = AsyncMock(return_value=None)
	db.rollback = AsyncMock()

	res = await update_budget(db, user_id=7, budgetid=999, data=BudgetUpdate(amount=Decimal("100.00")))
	assert res is None
	db.rollback.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_budget_success():
	db = MagicMock()
	db.execute = AsyncMock()
	existing_budget = Budget(budgetid=5, userid=7, categoryid=2, category_userid=7, amount=Decimal("50.00"))
	category = Category(categoryid=2, userid=7, parent_categoryid=None, name="Utilities")

	db.scalar = AsyncMock(side_effect=[
		existing_budget,   # select Budget with_for_update
		category,          # select Category
		Decimal("0.00"),   # children_total in _enforce_hierarchy
	])
	db.flush = AsyncMock()
	db.commit = AsyncMock()

	with patch("app.budgets.service.mutations._get_budget_item", AsyncMock(return_value={"budgetid": 5, "amount": 120.0})):
		item = await update_budget(db, user_id=7, budgetid=5, data=BudgetUpdate(amount=Decimal("120.00")))

	assert item["budgetid"] == 5
	assert existing_budget.amount == Decimal("120.00")
	db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_upsert_budget_existing():
	db = MagicMock()
	db.execute = AsyncMock()
	category = Category(categoryid=3, userid=7, parent_categoryid=None, name="Entertainment")
	existing_budget = Budget(budgetid=8, userid=7, categoryid=3, category_userid=7, amount=Decimal("40.00"))

	db.scalar = AsyncMock(side_effect=[
		category,          # Category by categoryid
		existing_budget,   # Existing budget
		Decimal("0.00"),   # children_total in hierarchy
	])
	db.flush = AsyncMock()
	db.commit = AsyncMock()

	with patch("app.budgets.service.mutations._get_budget_item", AsyncMock(return_value={"budgetid": 8, "amount": 80.0})):
		res = await upsert_budget(db, user_id=7, data=BudgetUpsert(categoryid=3, amount=Decimal("80.00")))

	assert res["budgetid"] == 8
	assert existing_budget.amount == Decimal("80.00")
	db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_upsert_budget_new():
	db = MagicMock()
	db.execute = AsyncMock()
	category = Category(categoryid=4, userid=7, parent_categoryid=None, name="Health")

	db.scalar = AsyncMock(side_effect=[
		category,          # Category by categoryid
		None,              # Existing budget is None
		Decimal("0.00"),   # children_total in hierarchy
	])
	db.add = MagicMock()
	db.flush = AsyncMock()
	db.commit = AsyncMock()

	with patch("app.budgets.service.mutations._get_budget_item", AsyncMock(return_value={"budgetid": 9, "amount": 65.0})):
		res = await upsert_budget(db, user_id=7, data=BudgetUpsert(categoryid=4, amount=Decimal("65.00")))

	assert res["budgetid"] == 9
	db.add.assert_called_once()
	db.commit.assert_awaited_once()

