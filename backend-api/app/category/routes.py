from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.category.models import Category
from app.auth.dependencies import CurrentUser
from app.db.database import get_db
from app.category.service import (
	list_categories,
)
from app.category.schemas import CategoryResponse

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryResponse])
async def get_categories(
	current_user: CurrentUser,
	db: Annotated[AsyncSession, Depends(get_db)],
) -> list[CategoryResponse]:
	categories = await list_categories(db, current_user.userid)
	return [CategoryResponse.model_validate(category) for category in categories]
