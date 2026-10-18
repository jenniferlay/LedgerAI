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
		# The composite FK requires parent and child to share a userid, so a
		# user's subcategory can only sit under one of their own categories.
		parent = await db.scalar(
			select(Category).where(
				Category.categoryid == data.parent_categoryid,
				Category.userid == user_id,
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