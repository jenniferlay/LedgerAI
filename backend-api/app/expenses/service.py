from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.expenses.models import Category, Expense
from app.expenses.schemas import ExpenseCreate


async def create_expense(
	db: AsyncSession, user_id: int, data: ExpenseCreate
) -> Expense:
	expense = Expense(userid=user_id, **data.model_dump())
	if data.categoryid is not None:
		expense.category_userid = (
			select(Category.userid)
			.where(Category.categoryid == data.categoryid)
			.scalar_subquery()
		)
	db.add(expense)
	await db.commit()
	await db.refresh(expense)
	return expense


async def list_expenses(
	db: AsyncSession,
	user_id: int,
	*,
	start_date: date | None = None,
	end_date: date | None = None,
	categoryid: int | None = None,
	merchant: str | None = None,
	limit: int = 100,
	offset: int = 0,
) -> list[Expense]:
	statement = select(Expense).where(Expense.userid == user_id)

	if start_date is not None:
		statement = statement.where(Expense.spent_on >= start_date)
	if end_date is not None:
		statement = statement.where(Expense.spent_on <= end_date)
	if categoryid is not None:
		statement = statement.where(Expense.categoryid == categoryid)
	if merchant is not None:
		escaped_merchant = (
			merchant.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
		)
		statement = statement.where(
			Expense.merchant.ilike(f"%{escaped_merchant}%", escape="\\")
		)

	statement = (
		statement.order_by(Expense.spent_on.desc(), Expense.expenseid.desc())
		.limit(limit)
		.offset(offset)
	)
	result = await db.scalars(statement)
	return list(result.all())