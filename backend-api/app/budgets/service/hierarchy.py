from decimal import Decimal

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.budgets.models import Budget
from app.budgets.service.exceptions import BudgetHierarchyError
from app.category.models import Category


def _money(value: Decimal) -> str:
	"""Format a Decimal as a currency string."""
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
	"""Sum of existing subcategory budgets under parent_categoryid in SQL."""
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

	total = await db.scalar(statement)
	return Decimal(total or 0)


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
		# Look up parent budget by category id and current user id.
		parent_amount = await db.scalar(
			select(Budget.amount).where(
				Budget.userid == user_id,
				Budget.categoryid == category.parent_categoryid,
			)
		)
		if parent_amount is not None:
			siblings = await _children_total(
				db, user_id, category.parent_categoryid, exclude_budgetid=budgetid
			)
			if siblings + amount > parent_amount:
				error = (
					f"Subcategory budgets would total {_money(siblings + amount)}, "
					f"which exceeds the parent budget of {_money(parent_amount)}"
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

