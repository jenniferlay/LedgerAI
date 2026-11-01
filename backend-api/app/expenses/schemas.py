from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

class ExpenseCreate(BaseModel):
	model_config = ConfigDict(extra="forbid")

	categoryid: int | None = Field(default=None, gt=0)
	amount: Decimal = Field(max_digits=14, decimal_places=2)
	note: str = Field(min_length=1)
	merchant: str | None = Field(default=None, max_length=255)
	spent_on: date | None = None

	@model_validator(mode="after")
	def check_amount_non_zero(self) -> "ExpenseCreate":
		if self.amount == 0:
			raise ValueError("Amount must not be zero")
		return self

class ExpenseResponse(BaseModel):
	model_config = ConfigDict(from_attributes=True)

	expenseid: int
	categoryid: int | None
	amount: float
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

class ExpenseUpdate(BaseModel):
	model_config = ConfigDict(extra="forbid")

	amount: Decimal | None = Field(default=None, max_digits=14, decimal_places=2)
	spent_on: date | None = None
	merchant: str | None = Field(default=None, max_length=255)
	categoryid: int | None = Field(default=None, gt=0)
	description: str | None = Field(default=None, min_length=1)

	@model_validator(mode="after")
	def check_amount_non_zero(self) -> "ExpenseUpdate":
		if self.amount == 0:
			raise ValueError("Amount must not be zero")
		return self


class DeleteResponse(BaseModel):
	message: str
