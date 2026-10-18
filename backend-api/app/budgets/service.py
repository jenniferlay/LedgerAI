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


class BudgetHierarchyError(Exception):
	"""Message is safe to show to the user."""


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


async def _fetch_parents(
	db: AsyncSession, category_ids: set[int]
) -> dict[int, Category]:
	if not category_ids:
		return {}
	# A parent always shares its child's owner, so anyone who can see the child
	# can see the parent; looking up by primary key is safe.
	result = await db.scalars(
		select(Category).where(Category.categoryid.in_(category_ids))
	)
	return {category.categoryid: category for category in result.all()}


def _build_groups(
	rows: list[Mapping[str, Any]], parents: dict[int, Category]
) -> list[dict[str, Any]]:
	"""Nest budgets: one group per top-level category, subcategory budgets as children.

	A group with its own budget uses that budget's limit/spent (which already include
	its subcategories). A group without one is only a container, so its limit/spent
	are the sum of its children.
	"""
	groups: dict[int, dict[str, Any]] = {}

	def standalone(row: Mapping[str, Any]) -> dict[str, Any]:
		return {
			"id": row["categoryid"],
			"budgetid": row["budgetid"],
			"name": row["name"],
			"icon": row["icon"],
			"spent": row["spent"],
			"limit": row["amount"],
			"children": [],
		}

	for row in rows:
		if row["parent_categoryid"] is None:
			groups[row["categoryid"]] = standalone(row)

	for row in rows:
		parent_id = row["parent_categoryid"]
		if parent_id is None:
			continue
		if parent_id not in groups:
			parent = parents.get(parent_id)
			if parent is None:  # parent vanished: show the budget on its own
				groups[row["categoryid"]] = standalone(row)
				continue
			groups[parent_id] = {
				"id": parent.categoryid,
				"budgetid": None,
				"name": parent.name,
				"icon": parent.icon,
				"spent": Decimal(0),
				"limit": Decimal(0),
				"children": [],
			}
		groups[parent_id]["children"].append(
			{
				"id": row["categoryid"],
				"budgetid": row["budgetid"],
				"name": row["name"],
				"icon": row["icon"],
				"spent": row["spent"],
				"limit": row["amount"],
			}
		)

	for group in groups.values():
		if group["budgetid"] is None:
			group["spent"] = sum((c["spent"] for c in group["children"]), Decimal(0))
			group["limit"] = sum((c["limit"] for c in group["children"]), Decimal(0))

	return sorted(groups.values(), key=lambda g: g["name"])


def _group_out(group: dict[str, Any]) -> dict[str, Any]:
	return {
		**group,
		"spent": float(group["spent"]),
		"limit": float(group["limit"]),
		"children": [
			{**c, "spent": float(c["spent"]), "limit": float(c["limit"])}
			for c in group["children"]
		],
	}


async def list_budgets(
	db: AsyncSession, user_id: int, month: date | None = None
) -> dict[str, Any]:
	start, end = _month_bounds(month)
	rows = await _fetch_budgets(db, user_id, start, end)
	uncategorized = await _uncategorized_spent(db, user_id, start, end)

	top_ids = {r["categoryid"] for r in rows if r["parent_categoryid"] is None}
	missing = {
		r["parent_categoryid"] for r in rows if r["parent_categoryid"] is not None
	} - top_ids
	parents = await _fetch_parents(db, missing)
	groups = _build_groups(rows, parents)

	# Each group's limit/spent is exactly what counts toward the totals: children
	# of a budgeted parent are already inside it, so nothing is double counted.
	total_budget = sum((g["limit"] for g in groups), Decimal(0))
	total_spent = sum((g["spent"] for g in groups), Decimal(0))

	today = date.today()
	days_remaining = (end - today).days if start <= today < end else 0

	return {
		"month": start,
		"total_budget": float(total_budget),
		"total_spent": float(total_spent),
		"total_remaining": float(total_budget - total_spent),
		"uncategorized_spent": float(uncategorized),
		"days_remaining": days_remaining,
		"groups": [_group_out(g) for g in groups],
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


def _money(value: Decimal) -> str:
	return f"${value:,.2f}"


async def _lock_user_budgets(db: AsyncSession, user_id: int) -> None:
	"""Serialize budget writes per user until commit/rollback.

	The parent >= children rule spans several rows, so two concurrent requests could
	each pass the check and together break it. A transaction-scoped advisory lock
	makes them take turns.
	"""
	await db.execute(select(func.pg_advisory_xact_lock(user_id)))


async def _children_total(
	db: AsyncSession,
	user_id: int,
	parent_categoryid: int,
	exclude_budgetid: int | None = None,
) -> Decimal:
	statement = (
		select(func.coalesce(func.sum(Budget.amount), 0))
		.select_from(Budget)
		.join(
			Category,
			and_(
				Category.categoryid == Budget.categoryid,
				Category.userid == Budget.category_userid,
			),
		)
		.where(
			Budget.userid == user_id,
			Category.parent_categoryid == parent_categoryid,
		)
	)
	if exclude_budgetid is not None:
		statement = statement.where(Budget.budgetid != exclude_budgetid)
	return Decimal(await db.scalar(statement))


async def _enforce_hierarchy(
	db: AsyncSession,
	user_id: int,
	category: Category,
	amount: Decimal,
	budgetid: int | None = None,
) -> None:
	"""A parent's budget must cover the total of its subcategory budgets.

	Call with the user lock held. Rolls back (releasing the lock) before raising.
	"""
	error: str | None = None

	# As a child: the new total of siblings (plus this one) must fit in the parent.
	if category.parent_categoryid is not None:
		# A parent shares its child's owner, so category.userid is the parent's too.
		parent_amount = await db.scalar(
			select(Budget.amount).where(
				Budget.userid == user_id,
				Budget.categoryid == category.parent_categoryid,
				Budget.category_userid == category.userid,
			)
		)
		if parent_amount is not None:
			siblings = await _children_total(
				db, user_id, category.parent_categoryid, exclude_budgetid=budgetid
			)
			if siblings + amount > parent_amount:
				error = (
				"Subcategory budgets would total {_money(siblings + amount)}, "
				"which exceeds the parent budget of {_money(parent_amount)}"
				)

	# As a parent: the amount must cover the budgets already set on its children.
	if error is None:
		children = await _children_total(db, user_id, category.categoryid)
		if amount < children:
			error = (
				f"Budget must be at least {_money(children)}, "
				"the total of its subcategory budgets"
			)

	if error is not None:
		await db.rollback()
		raise BudgetHierarchyError(error)


async def create_budget(
	db: AsyncSession, user_id: int, data: BudgetCreate
) -> dict[str, Any]:
	# Only the user's own categories or global ones (userid 0) are allowed.
	# Compare to None: a global category's userid is 0, which is falsy.
	category = await db.scalar(
		select(Category).where(
			Category.categoryid == data.categoryid,
			Category.userid.in_((0, user_id)),
		)
	)
	if category is None:
		raise CategoryNotFoundError

	await _lock_user_budgets(db, user_id)
	await _enforce_hierarchy(db, user_id, category, data.amount)

	budget = Budget(
		userid=user_id,
		categoryid=category.categoryid,
		category_userid=category.userid,
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
	await _lock_user_budgets(db, user_id)
	budget = await db.get(Budget, budgetid)
	if not budget or budget.userid != user_id:
		await db.rollback()
		return None

	category = await db.scalar(
		select(Category).where(
			Category.categoryid == budget.categoryid,
			Category.userid == budget.category_userid,
		)
	)
	await _enforce_hierarchy(db, user_id, category, data.amount, budgetid)

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