from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.category.models import Category


async def list_categories(db: AsyncSession, user_id: int) -> list[Category]:
	statement = (
		select(Category)
		.where(Category.userid.in_((0, user_id)))
		.order_by(Category.parent_categoryid, Category.name, Category.categoryid)
	)
	result = await db.scalars(statement)
	return list(result.all())
