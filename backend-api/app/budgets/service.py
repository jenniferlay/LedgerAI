from datetime import date
from decimal import Decimal
from typing import Any, Mapping

from sqlalchemy import (
	BigInteger,
	Numeric,
	and_,
	case,
	cast,
	func,
	or_,
	select,
	union_all,
)
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.budgets.models import Budget
from app.budgets.schemas import BudgetCreate, BudgetUpdate
from app.category.models import Category
from app.expenses.models import Expense
from app.plaid.models import PlaidItem, PlaidTransaction


class CategoryNotFoundError(Exception):
	pass


class BudgetExistsError(Exception):
	pass


def _month_bounds(month: date | None) -> tuple[date, date]:
	"""First day of the month containing `month` (default: today) and of the next."""
	start = (month or date.today()).replace(day=1)
	next_start = date(start.year + (start.month == 12), start.month % 12 + 1, 1)
	return start, next_start


def _expense_amount():
	"""Signed dollars for a manual expense (dollars/cents are stored separately)."""
	dollars = cast(Expense.amount_dollars, BigInteger)
	cents = case(
		(Expense.amount_dollars < 0, dollars * 100 - Expense.amount_cents),
		else_=dollars * 100 + Expense.amount_cents,
	)
	return cast(cents, Numeric(14, 2)) / 100


def _spend_subquery(user_id: int, start: date, end: date):
	"""All of the user's spending in [start, end) from both sources."""
	manual = select(
		Expense.categoryid.label("categoryid"),
		Expense.category_userid.label("category_userid"),
		_expense_amount().label("amount"),
	).where(
		Expense.userid == user_id,
		Expense.spent_on >= start,
		Expense.spent_on < end,
	)

	# Plaid: positive = money out (negatives are mostly income, so skipped);
	# pending rows are skipped because they re-post as new rows.
	plaid = (
		select(
			PlaidTransaction.categoryid.label("categoryid"),
			PlaidTransaction.category_userid.label("category_userid"),
			PlaidTransaction.amount.label("amount"),
		)
		.join(PlaidItem, PlaidTransaction.plaid_item_id == PlaidItem.id)
		.where(
			PlaidItem.user_id == user_id,
			PlaidTransaction.pending.is_(False),
			PlaidTransaction.amount > 0,
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
	# A budget counts spending in its own category plus its direct subcategories.
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
		.group_by(Budget.budgetid, Category.categoryid)
		.order_by(Category.name, Budget.budgetid)
	)
	if budgetid is not None:
		statement = statement.where(Budget.budgetid == budgetid)

	result = await db.execute(statement)
	return list(result.mappings().all())


def _to_item(row: Mapping[str, Any]) -> dict[str, Any]:
	amount: Decimal = row["amount"]
	spent: Decimal = row["spent"]
	return {
		"budgetid": row["budgetid"],
		"categoryid": row["categoryid"],
		"parent_categoryid": row["parent_categoryid"],
		"name": row["name"],
		"icon": row["icon"],
		"amount": float(amount),
		"spent": float(spent),
		"remaining": float(amount - spent),
	}


async def list_budgets(
	db: AsyncSession, user_id: int, month: date | None = None
) -> dict[str, Any]:
	start, end = _month_bounds(month)
	rows = await _fetch_budgets(db, user_id, start, end)
	uncategorized = await _uncategorized_spent(db, user_id, start, end)

	# Totals skip budgets whose parent is also budgeted: the parent's spent
	# already includes them, so counting both would double count.
	budgeted_ids = {row["categoryid"] for row in rows}
	roots = [row for row in rows if row["parent_categoryid"] not in budgeted_ids]
	total_budget = sum((row["amount"] for row in roots), Decimal(0))
	total_spent = sum((row["spent"] for row in roots), Decimal(0))

	today = date.today()
	days_remaining = (end - today).days if start <= today < end else 0

	return {
		"month": start,
		"total_budget": float(total_budget),
		"total_spent": float(total_spent),
		"total_remaining": float(total_budget - total_spent),
		"uncategorized_spent": float(uncategorized),
		"days_remaining": days_remaining,
		"budgets": [_to_item(row) for row in rows],
	}


async def _get_budget_item(
	db: AsyncSession, user_id: int, budgetid: int
) -> dict[str, Any]:
	start, end = _month_bounds(None)
	rows = await _fetch_budgets(db, user_id, start, end, budgetid=budgetid)
	return _to_item(rows[0])


async def get_budget(
	db: AsyncSession, user_id: int, budgetid: int, month: date | None = None
) -> dict[str, Any] | None:
	start, end = _month_bounds(month)
	rows = await _fetch_budgets(db, user_id, start, end, budgetid=budgetid)
	return _to_item(rows[0]) if rows else None


async def _uncategorized_spent(
	db: AsyncSession, user_id: int, start: date, end: date
) -> Decimal:
	"""Spending with no category yet (e.g. Plaid rows awaiting the categorizer)."""
	spend = _spend_subquery(user_id, start, end)
	total = await db.scalar(
		select(func.coalesce(func.sum(spend.c.amount), 0)).where(
			spend.c.categoryid.is_(None)
		)
	)
	return Decimal(total)


async def create_budget(
	db: AsyncSession, user_id: int, data: BudgetCreate
) -> dict[str, Any]:
	# Only the user's own categories or global ones (userid 0) are allowed.
	# Compare to None: a global category's userid is 0, which is falsy.
	category_userid = await db.scalar(
		select(Category.userid).where(
			Category.categoryid == data.categoryid,
			Category.userid.in_((0, user_id)),
		)
	)
	if category_userid is None:
		raise CategoryNotFoundError

	budget = Budget(
		userid=user_id,
		categoryid=data.categoryid,
		category_userid=category_userid,
		amount=data.amount,
	)
	db.add(budget)
	try:
		# The UNIQUE constraint is the source of truth, so no racy pre-check.
		await db.flush()
	except IntegrityError:
		await db.rollback()
		raise BudgetExistsError
	budgetid = budget.budgetid
	await db.commit()

	return await _get_budget_item(db, user_id, budgetid)


async def update_budget(
	db: AsyncSession, user_id: int, budgetid: int, data: BudgetUpdate
) -> dict[str, Any] | None:
	budget = await db.get(Budget, budgetid)
	if not budget or budget.userid != user_id:
		return None

	budget.amount = data.amount
	await db.commit()

	return await _get_budget_item(db, user_id, budgetid)


async def delete_budget(db: AsyncSession, user_id: int, budgetid: int) -> bool:
	budget = await db.get(Budget, budgetid)
	if not budget or budget.userid != user_id:
		return False
	await db.delete(budget)
	await db.commit()
	return True