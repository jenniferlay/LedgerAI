from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import CurrentUser
from app.db.database import get_db
from app.expenses.schemas import (
	DeleteResponse,
	ExpenseCreate,
	ExpenseFeedItem,
	ExpenseResponse,
	ExpenseUpdate,
)
from app.expenses.service import (
	create_expense,
	delete_expense_item,
	list_expense_feed,
	update_expense_item,
)
from app.category.service import list_categories


router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def post_expense(
	expense_data: ExpenseCreate,
	current_user: CurrentUser,
	db: Annotated[AsyncSession, Depends(get_db)],
) -> ExpenseResponse:
	expense = await create_expense(db, current_user.userid, expense_data)
	return ExpenseResponse.model_validate(expense)


@router.get("", response_model=list[ExpenseFeedItem])
async def get_expenses(
	current_user: CurrentUser,
	db: Annotated[AsyncSession, Depends(get_db)],
	start_date: date | None = None,
	end_date: date | None = None,
	categoryid: Annotated[int | None, Query(gt=0)] = None,
	merchant: Annotated[str | None, Query(min_length=1, max_length=255)] = None,
	limit: Annotated[int, Query(ge=1, le=500)] = 100,
	offset: Annotated[int, Query(ge=0)] = 0,
) -> list[ExpenseFeedItem]:
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

	feed_items = await list_expense_feed(
		db,
		current_user.userid,
		start_date=start_date,
		end_date=end_date,
		categoryid=categoryid,
		merchant=merchant,
		limit=limit,
		offset=offset,
	)
	return [ExpenseFeedItem.model_validate(item) for item in feed_items]


@router.put("/{source}/{item_id}", response_model=ExpenseFeedItem)
async def update_expense(
	source: str,
	item_id: int,
	expense_data: ExpenseUpdate,
	current_user: CurrentUser,
	db: Annotated[AsyncSession, Depends(get_db)],
) -> ExpenseFeedItem:
	if source not in ("manual", "plaid"):
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Source must be 'manual' or 'plaid'",
		)

	updated = await update_expense_item(db, current_user.userid, source, item_id, expense_data)
	if not updated:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="Expense item not found",
		)
	return ExpenseFeedItem.model_validate(updated)


@router.delete("/{source}/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
	source: str,
	item_id: int,
	current_user: CurrentUser,
	db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
	if source not in ("manual", "plaid"):
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Source must be 'manual' or 'plaid'",
		)

	success = await delete_expense_item(db, current_user.userid, source, item_id)
	if not success:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="Expense item not found",
		)
	return None


