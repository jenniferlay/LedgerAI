from typing import Any

from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.budgets.models import Budget
from app.budgets.schemas import BudgetCreate, BudgetUpdate, BudgetUpsert
from app.budgets.service.exceptions import (
	BudgetExistsError,
	CategoryNotFoundError,
)
from app.budgets.service.hierarchy import _enforce_hierarchy, _lock_user_budgets
from app.budgets.service.reporting import _get_budget_item
from app.category.models import Category


async def create_budget(
	db: AsyncSession, user_id: int, data: BudgetCreate
) -> dict[str, Any]:
	"""Create a new budget limit for a category with ACID transaction safety."""
	await _lock_user_budgets(db, user_id)
	try:
		# Category must belong to the user or be a global category (userid == 0)
		category = await db.scalar(
			select(Category).where(
				Category.categoryid == data.categoryid,
				Category.userid.in_((0, user_id)),
			)
		)
		if category is None:
			raise CategoryNotFoundError

		await _enforce_hierarchy(db, user_id, category, data.amount)

		budget = Budget(
			userid=user_id,
			categoryid=category.categoryid,
			category_userid=category.userid,
			amount=data.amount,
		)
		db.add(budget)
		try:
			# The UNIQUE constraint is the ultimate source of truth
			await db.flush()
		except IntegrityError:
			raise BudgetExistsError

		budgetid = budget.budgetid
		item = await _get_budget_item(db, user_id, budgetid)
		await db.commit()
		return item
	except Exception:
		await db.rollback()
		raise


async def update_budget(
	db: AsyncSession, user_id: int, budgetid: int, data: BudgetUpdate
) -> dict[str, Any] | None:
	"""Update an existing budget amount under a row-level lock and transaction."""
	await _lock_user_budgets(db, user_id)
	try:
		# Lock the budget row for update
		statement = (
			select(Budget)
			.where(Budget.budgetid == budgetid, Budget.userid == user_id)
			.with_for_update()
		)
		budget = await db.scalar(statement)
		if not budget:
			await db.rollback()
			return None

		category = await db.scalar(
			select(Category).where(
				Category.categoryid == budget.categoryid,
				Category.userid == budget.category_userid,
			)
		)
		if category is None:
			raise CategoryNotFoundError

		await _enforce_hierarchy(db, user_id, category, data.amount, budgetid=budgetid)

		budget.amount = data.amount
		await db.flush()

		item = await _get_budget_item(db, user_id, budgetid)
		await db.commit()
		return item
	except Exception:
		await db.rollback()
		raise


async def delete_budget(db: AsyncSession, user_id: int, budgetid: int) -> bool:
	"""Delete a budget in a single atomic SQL statement within a transaction."""
	await _lock_user_budgets(db, user_id)
	try:
		statement = (
			delete(Budget)
			.where(Budget.budgetid == budgetid, Budget.userid == user_id)
		)
		result = await db.execute(statement)
		if result.rowcount == 0:
			await db.rollback()
			return False
		await db.commit()
		return True
	except Exception:
		await db.rollback()
		raise


async def upsert_budget(
	db: AsyncSession, user_id: int, data: BudgetUpsert
) -> dict[str, Any]:
	"""Insert or update a category budget with atomic hierarchy validation and row locking."""
	await _lock_user_budgets(db, user_id)
	try:
		category: Category | None = None

		if data.categoryid is not None:
			category = await db.scalar(
				select(Category).where(
					Category.categoryid == data.categoryid,
					Category.userid.in_((0, user_id)),
				)
			)

		if category is None and data.category_name and data.category_name.strip():
			norm_name = data.category_name.strip()
			# Prefer user-specific category over global if names match
			category = await db.scalar(
				select(Category)
				.where(
					func.lower(Category.name) == func.lower(norm_name),
					Category.userid.in_((0, user_id)),
				)
				.order_by(Category.userid.desc())
				.limit(1)
			)
			if category is None and data.create_category_if_missing:
				category = Category(
					userid=user_id,
					parent_categoryid=None,
					name=norm_name,
					icon="category",
				)
				db.add(category)
				await db.flush()

		if category is None:
			raise CategoryNotFoundError

		# Fetch existing budget with row lock if present
		existing_budget = await db.scalar(
			select(Budget)
			.where(
				Budget.userid == user_id,
				Budget.categoryid == category.categoryid,
				Budget.category_userid == category.userid,
			)
			.with_for_update()
		)

		if existing_budget is not None:
			await _enforce_hierarchy(
				db, user_id, category, data.amount, budgetid=existing_budget.budgetid
			)
			existing_budget.amount = data.amount
			budgetid = existing_budget.budgetid
			await db.flush()
		else:
			await _enforce_hierarchy(db, user_id, category, data.amount)
			budget = Budget(
				userid=user_id,
				categoryid=category.categoryid,
				category_userid=category.userid,
				amount=data.amount,
			)
			db.add(budget)
			await db.flush()
			budgetid = budget.budgetid

		item = await _get_budget_item(db, user_id, budgetid)
		await db.commit()
		return item
	except Exception:
		await db.rollback()
		raise

