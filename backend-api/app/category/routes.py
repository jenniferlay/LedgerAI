from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import CurrentUser
from app.category.icons import MATERIAL_ICONS
from app.category.schemas import CategoryCreate, CategoryResponse
from app.category.service import (
	CategoryExistsError,
	ParentNotFoundError,
	ParentTooDeepError,
	create_category,
	list_categories,
)
from app.db.database import get_db

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryResponse])
async def get_categories(
	current_user: CurrentUser,
	db: Annotated[AsyncSession, Depends(get_db)],
) -> list[CategoryResponse]:
	categories = await list_categories(db, current_user.userid)
	return [CategoryResponse.model_validate(category) for category in categories]

@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def post_category(
	category_data: CategoryCreate,
	current_user: CurrentUser,
	db: Annotated[AsyncSession, Depends(get_db)],
) -> CategoryResponse:
	try:
		category = await create_category(db, current_user.userid, category_data)
	except ParentNotFoundError:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="Parent must be one of your own categories",
		)
	except ParentTooDeepError:
		raise HTTPException(
			status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
			detail="Subcategories can only be one level deep",
		)
	except CategoryExistsError:
		raise HTTPException(
			status_code=status.HTTP_409_CONFLICT,
			detail="A category with this name already exists here",
		)
	return CategoryResponse.model_validate(category)