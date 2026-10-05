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