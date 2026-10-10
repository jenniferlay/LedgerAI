from datetime import date

from pydantic import BaseModel, ConfigDict, Field, model_validator

class ExpenseCreate(BaseModel):
	model_config = ConfigDict(extra="forbid")

	categoryid: int | None = Field(default=1, gt=0)
	amount_dollars: int = Field(ge=0, le=2_147_483_647)
	amount_cents: int = Field(default=0, ge=0, le=99)
	note: str = Field(min_length=1)
	merchant: str | None = Field(default=None, max_length=255)
	spent_on: date | None = None

class ExpenseResponse(BaseModel):
	model_config = ConfigDict(from_attributes=True)

	expenseid: int
	categoryid: int | None
	amount_dollars: int
	amount_cents: int
	note: str
	merchant: str | None
	spent_on: date


class CategoryResponse(BaseModel):
	model_config = ConfigDict(from_attributes=True)

	categoryid: int
	parent_categoryid: int | None
	name: str
