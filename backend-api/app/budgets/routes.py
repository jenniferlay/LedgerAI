from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import CurrentUser
from app.budgets.schemas import (
	BudgetCreate,
	BudgetResponse,
	BudgetSummaryResponse,
	BudgetUpdate,
)
from app.budgets.service import (
	BudgetExistsError,
	CategoryNotFoundError,
	create_budget,
	delete_budget,
	get_budget,
	list_budgets,
	update_budget,
)
from app.db.database import get_db
from app.expenses.schemas import DeleteResponse

router = APIRouter(prefix="/budgets", tags=["budgets"])


@router.get("", response_model=BudgetSummaryResponse)
async def get_budgets(
	current_user: CurrentUser,
	db: Annotated[AsyncSession, Depends(get_db)],
	month: Annotated[
		date | None,
		Query(description="Any date in the month to report on. Defaults to this month."),
	] = None,
) -> BudgetSummaryResponse:
	summary = await list_budgets(db, current_user.userid, month)
	return BudgetSummaryResponse.model_validate(summary)


@router.get("/{budgetid}", response_model=BudgetResponse)
async def get_budget_by_id(
	budgetid: int,
	current_user: CurrentUser,
	db: Annotated[AsyncSession, Depends(get_db)],
	month: Annotated[
		date | None,
		Query(description="Any date in the month to report on. Defaults to this month."),
	] = None,
) -> BudgetResponse:
	budget = await get_budget(db, current_user.userid, budgetid, month)
	if not budget:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="Budget not found",
		)
	return BudgetResponse.model_validate(budget)


@router.post("", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
async def post_budget(
	budget_data: BudgetCreate,
	current_user: CurrentUser,
	db: Annotated[AsyncSession, Depends(get_db)],
) -> BudgetResponse:
	try:
		budget = await create_budget(db, current_user.userid, budget_data)
	except CategoryNotFoundError:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="Category not found",
		)
	except BudgetExistsError:
		raise HTTPException(
			status_code=status.HTTP_409_CONFLICT,
			detail="A budget already exists for this category",
		)
	return BudgetResponse.model_validate(budget)


@router.put("/{budgetid}", response_model=BudgetResponse)
async def put_budget(
	budgetid: int,
	budget_data: BudgetUpdate,
	current_user: CurrentUser,
	db: Annotated[AsyncSession, Depends(get_db)],
) -> BudgetResponse:
	updated = await update_budget(db, current_user.userid, budgetid, budget_data)
	if not updated:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="Budget not found",
		)
	return BudgetResponse.model_validate(updated)


@router.delete("/{budgetid}", response_model=DeleteResponse)
async def remove_budget(
	budgetid: int,
	current_user: CurrentUser,
	db: Annotated[AsyncSession, Depends(get_db)],
) -> DeleteResponse:
	success = await delete_budget(db, current_user.userid, budgetid)
	if not success:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="Budget not found",
		)
	return DeleteResponse(message="Budget deleted successfully")