from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class BudgetCreate(BaseModel):
	model_config = ConfigDict(extra="forbid")

	categoryid: int = Field(gt=0)
	amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)


class BudgetUpdate(BaseModel):
	model_config = ConfigDict(extra="forbid")

	amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)


class BudgetResponse(BaseModel):
	budgetid: int
	categoryid: int
	parent_categoryid: int | None
	name: str
	icon: str | None
	amount: float
	spent: float
	remaining: float  # negative when over budget


class BudgetSummaryResponse(BaseModel):
	month: date  # first day of the month
	total_budget: float
	total_spent: float
	total_remaining: float
	uncategorized_spent: float  # spending with no category yet; not in any budget
	days_remaining: int
	budgets: list[BudgetResponse]