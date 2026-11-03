from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class BudgetCreate(BaseModel):
	model_config = ConfigDict(extra="forbid")

	categoryid: int = Field(gt=0)
	amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)


class BudgetUpdate(BaseModel):
	model_config = ConfigDict(extra="forbid")

	amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)


class BudgetUpsert(BaseModel):
	model_config = ConfigDict(extra="forbid")

	amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
	categoryid: int | None = Field(default=None, gt=0)
	category_name: str | None = Field(default=None, max_length=100)
	create_category_if_missing: bool = True

	@model_validator(mode="after")
	def check_category_identifier(self) -> "BudgetUpsert":
		if self.categoryid is None and (not self.category_name or not self.category_name.strip()):
			raise ValueError("Either categoryid or category_name must be provided")
		return self


class BudgetResponse(BaseModel):
	budgetid: int
	categoryid: int
	parent_categoryid: int | None
	name: str
	icon: str | None
	amount: float
	spent: float
	remaining: float  # negative when over budget


class SubBudgetResponse(BaseModel):
	id: int  # categoryid, stable key for lists
	budgetid: int  # use this for PUT/DELETE /budgets/{budgetid}
	name: str
	icon: str | None
	spent: float
	limit: float


class BudgetGroupResponse(BaseModel):
	id: int  # categoryid of the top-level category
	budgetid: int | None  # None when the group is only a container for child budgets
	name: str
	icon: str | None
	spent: float
	limit: float
	children: list[SubBudgetResponse]


class BudgetSummaryResponse(BaseModel):
	month: date  # first day of the month
	total_budget: float
	total_spent: float
	total_remaining: float
	uncategorized_spent: float  # spending with no category yet; not in any budget
	days_remaining: int
	groups: list[BudgetGroupResponse]
