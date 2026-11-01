from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.category.models import Category
from app.category.schemas import CategoryCreate


class ParentNotFoundError(Exception):
	pass


class ParentTooDeepError(Exception):
	pass


class CategoryExistsError(Exception):
	pass


async def get_category_owner(
	db: AsyncSession, user_id: int, categoryid: int
) -> int | None:
	"""Return the category's owner if it is user-owned or global."""
	return await db.scalar(
		select(Category.userid).where(
			Category.categoryid == categoryid,
			Category.userid.in_((user_id, 0)),
		)
	)


async def list_categories(db: AsyncSession, user_id: int) -> list[Category]:
	statement = (
		select(Category)
		.where(Category.userid.in_((0, user_id)))
		.order_by(Category.parent_categoryid, Category.name, Category.categoryid)
	)
	result = await db.scalars(statement)
	return list(result.all())


async def create_category(
	db: AsyncSession, user_id: int, data: CategoryCreate
) -> Category:
	if data.parent_categoryid is not None:
		# Subcategories can sit under global categories or the user's own categories.
		parent = await db.scalar(
			select(Category).where(
				Category.categoryid == data.parent_categoryid,
				Category.userid.in_((0, user_id)),
			)
		)
		if parent is None:
			raise ParentNotFoundError
		# Budgets roll up one level of children, so keep the tree two levels deep.
		if parent.parent_categoryid is not None:
			raise ParentTooDeepError

	category = Category(
		userid=user_id,
		parent_categoryid=data.parent_categoryid,
		name=data.name,
		icon=data.icon,
	)
	db.add(category)
	try:
		# UNIQUE (userid, parent_categoryid, name) is the source of truth.
		await db.commit()
	except IntegrityError:
		await db.rollback()
		raise CategoryExistsError
	await db.refresh(category)
	return category