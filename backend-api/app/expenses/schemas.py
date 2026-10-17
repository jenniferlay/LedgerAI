from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

class ExpenseCreate(BaseModel):
	model_config = ConfigDict(extra="forbid")

	categoryid: int | None = Field(default=1, gt=0)
	amount_dollars: int = Field(ge=-2_147_483_648, le=2_147_483_647)
	amount_cents: int = Field(default=0, ge=0, le=99)
	note: str = Field(min_length=1)
	merchant: str | None = Field(default=None, max_length=255)
	spent_on: date | None = None

	@model_validator(mode="after")
	def check_amount_non_zero(self) -> "ExpenseCreate":
		if self.amount_dollars == 0 and self.amount_cents == 0:
			raise ValueError("Amount must not be zero")
		return self

class ExpenseResponse(BaseModel):
	model_config = ConfigDict(from_attributes=True)

	expenseid: int
	categoryid: int | None
	amount_dollars: int
	amount_cents: int
	note: str
	merchant: str | None
	spent_on: date


class ExpenseFeedItem(BaseModel):
	source: Literal["manual", "plaid"]
	id: int
	amount: float
	spent_on: date
	merchant: str | None
	description: str
	categoryid: int | None = None


class CategoryResponse(BaseModel):
	model_config = ConfigDict(from_attributes=True)

	categoryid: int
	parent_categoryid: int | None
	name: str

class ExpenseUpdate(BaseModel):
	model_config = ConfigDict(extra="forbid")

	amount: float | None = Field(default=None)
	spent_on: date | None = None
	merchant: str | None = Field(default=None, max_length=255)
	categoryid: int | None = Field(default=None, gt=0)
	description: str | None = Field(default=None, min_length=1)

	@model_validator(mode="after")
	def check_amount_non_zero(self) -> "ExpenseUpdate":
		if self.amount is not None and self.amount == 0:
			raise ValueError("Amount must not be zero")
		return self

