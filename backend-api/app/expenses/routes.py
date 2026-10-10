from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import CurrentUser
from app.db.database import get_db
from app.expenses.schemas import CategoryResponse, ExpenseCreate, ExpenseResponse
from app.expenses.service import create_expense, list_categories, list_expenses

router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.get("/categories", response_model=list[CategoryResponse])
async def get_expense_categories(
	current_user: CurrentUser,
	db: Annotated[AsyncSession, Depends(get_db)],
) -> list[CategoryResponse]:
	categories = await list_categories(db, current_user.userid)
	return [CategoryResponse.model_validate(category) for category in categories]


@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def post_expense(
	expense_data: ExpenseCreate,
	current_user: CurrentUser,
	db: Annotated[AsyncSession, Depends(get_db)],
) -> ExpenseResponse:
	expense = await create_expense(db, current_user.userid, expense_data)
	return ExpenseResponse.model_validate(expense)


@router.get("", response_model=list[ExpenseResponse])
async def get_expenses(
	current_user: CurrentUser,
	db: Annotated[AsyncSession, Depends(get_db)],
	start_date: date | None = None,
	end_date: date | None = None,
	categoryid: Annotated[int | None, Query(gt=0)] = None,
	merchant: Annotated[str | None, Query(min_length=1, max_length=255)] = None,
	limit: Annotated[int, Query(ge=1, le=500)] = 100,
	offset: Annotated[int, Query(ge=0)] = 0,
) -> list[ExpenseResponse]:
	if start_date is not None and end_date is not None and start_date > end_date:
		raise HTTPException(
			status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
			detail="start_date must be on or before end_date",
		)
	if merchant is not None and not merchant.strip():
		raise HTTPException(
			status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
			detail="merchant must contain non-whitespace characters",
		)

	expenses = await list_expenses(
		db,
		current_user.userid,
		start_date=start_date,
		end_date=end_date,
		categoryid=categoryid,
		merchant=merchant,
		limit=limit,
		offset=offset,
	)
	return [ExpenseResponse.model_validate(expense) for expense in expenses]
