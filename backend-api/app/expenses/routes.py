from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import CurrentUser
from app.db.database import get_db
from app.expenses.schemas import ExpenseCreate, ExpenseResponse
from app.expenses.service import create_expense

router = APIRouter(prefix="/expenses", tags=["expenses"])

@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def post_expense(
	expense_data: ExpenseCreate,
	current_user: CurrentUser,
	db: Annotated[AsyncSession, Depends(get_db)],
) -> ExpenseResponse:
	expense = await create_expense(db, current_user.userid, expense_data)
	return ExpenseResponse.model_validate(expense)
