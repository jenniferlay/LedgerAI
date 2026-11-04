from datetime import date
from decimal import Decimal
from typing import Any, Mapping

from sqlalchemy import and_, func, or_, select, union_all
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased
from sqlalchemy.sql.selectable import Subquery

from app.budgets.models import Budget
from app.category.models import Category
from app.expenses.models import Expense
from app.plaid.models import (
	PlaidItem,
	PlaidTransaction,
	plaid_effective_categoryid,
)


def _month_bounds(month: date | None) -> tuple[date, date]:
	"""Return the first day of the month containing `month` (default: today) and next month start."""
	start = (month or date.today()).replace(day=1)
	next_start = date(start.year + (start.month == 12), start.month % 12 + 1, 1)
	return start, next_start


def _spend_subquery(user_id: int, start: date, end: date) -> Subquery:
	"""All of the user's signed transaction amounts in [start, end)."""
	manual = select(
		Expense.categoryid.label("categoryid"),
		Expense.category_userid.label("category_userid"),
		Expense.amount.label("amount"),
	).where(
		Expense.userid == user_id,
		Expense.spent_on >= start,
		Expense.spent_on < end,
	)

	# Pending rows are skipped because they re-post as new rows.
	plaid = (
		select(
			plaid_effective_categoryid().label("categoryid"),
			func.coalesce(PlaidTransaction.category_userid, 0).label(
				"category_userid"
			),
			PlaidTransaction.amount.label("amount"),
		)
		.join(PlaidItem, PlaidTransaction.plaid_item_id == PlaidItem.id)
		.where(
			PlaidItem.user_id == user_id,
			PlaidTransaction.pending.is_(False),
			PlaidTransaction.hidden.is_(False),
			PlaidTransaction.is_transfer.is_(False),
			PlaidTransaction.transaction_date >= start,
			PlaidTransaction.transaction_date < end,
		)
	)
	return union_all(manual, plaid).subquery("spend")


async def _fetch_budgets(
	db: AsyncSession,
	user_id: int,
	start: date,
	end: date,
	budgetid: int | None = None,
) -> list[Mapping[str, Any]]:
	"""Fetch budget rows along with aggregate spending for the given date range.

	A budget aggregates spending in its own category plus its direct subcategories.
	"""
	child = aliased(Category)
	spend = _spend_subquery(user_id, start, end)

	statement = (
		select(
			Budget.budgetid,
			Budget.categoryid,
			Budget.amount,
			Category.parent_categoryid,
			Category.name,
			Category.icon,
			func.coalesce(func.sum(spend.c.amount), 0).label("spent"),
		)
		.select_from(Budget)
		.join(
			Category,
			and_(
				Category.categoryid == Budget.categoryid,
				Category.userid == Budget.category_userid,
			),
		)
		.outerjoin(
			child,
			and_(
				child.userid == Budget.category_userid,
				or_(
					child.categoryid == Budget.categoryid,
					child.parent_categoryid == Budget.categoryid,
				),
			),
		)
		.outerjoin(
			spend,
			and_(
				spend.c.categoryid == child.categoryid,
				spend.c.category_userid == child.userid,
			),
		)
		.where(Budget.userid == user_id)
		.group_by(
			Budget.budgetid,
			Budget.categoryid,
			Budget.amount,
			Category.parent_categoryid,
			Category.name,
			Category.icon,
		)
		.order_by(Category.name, Budget.budgetid)
	)
	if budgetid is not None:
		statement = statement.where(Budget.budgetid == budgetid)

	result = await db.execute(statement)
	return list(result.mappings().all())


async def _uncategorized_spent(
	db: AsyncSession, user_id: int, start: date, end: date
) -> Decimal:
	"""Signed transaction amounts with no effective category in [start, end)."""
	spend = _spend_subquery(user_id, start, end)
	total = await db.scalar(
		select(func.coalesce(func.sum(spend.c.amount), 0)).where(
			spend.c.categoryid.is_(None)
		)
	)
	return Decimal(total or 0)


async def _fetch_parents(
	db: AsyncSession, category_ids: set[int], user_id: int | None = None
) -> dict[int, Category]:
	"""Look up parent categories by primary key, scoping by tenant when user_id is provided."""
	if not category_ids:
		return {}

	statement = select(Category).where(Category.categoryid.in_(category_ids))
	if user_id is not None:
		statement = statement.where(Category.userid.in_((0, user_id)))

	result = await db.scalars(statement)
	return {category.categoryid: category for category in result.all()}

