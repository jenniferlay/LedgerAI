"""Shared Pydantic models used across the agent and its tools."""

from dataclasses import dataclass
from datetime import date

from pydantic import BaseModel

__all__ = [
  "ExpenseRecord",
  "AccountRecord",
  "NetWorthRecord",
  "CategoryRecord",
  "BudgetRecord",
  "AgentDeps",
]


class ExpenseRecord(BaseModel):
  source: str
  id: int
  amount: float
  spent_on: date
  merchant: str | None = None
  description: str
  
  # Manual-specific fields
  categoryid: int | None = None
  
  # Plaid-specific fields
  transaction_id: str | None = None
  account_id: str | None = None
  pending: bool | None = None
  currency: str | None = None
  is_transfer: bool = False
  account_name: str | None = None
  account_mask: str | None = None
  account_type: str | None = None
  account_subtype: str | None = None


class AccountRecord(BaseModel):
  account_id: str
  name: str
  official_name: str | None = None
  type: str
  subtype: str | None = None
  mask: str | None = None
  current_balance: float | None = None
  available_balance: float | None = None
  credit_limit: float | None = None
  iso_currency_code: str | None = "USD"
  is_active: bool


class NetWorthRecord(BaseModel):
  net_worth: float
  total_assets: float
  total_liabilities: float
  depository_total: float
  credit_total: float
  manual_cash: float = 0.0
  currency: str = "USD"
  account_count: int


class CategoryRecord(BaseModel):
  categoryid: int
  parent_categoryid: int | None
  name: str


class BudgetRecord(BaseModel):
  budgetid: int
  categoryid: int
  parent_categoryid: int | None = None
  name: str
  icon: str | None = None
  amount: float
  spent: float
  remaining: float


@dataclass(frozen=True)
class AgentDeps:
  api_base_url: str
  access_token: str
  categories: list[CategoryRecord]
