from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class LinkTokenResponse(BaseModel):
  link_token: str


class PublicTokenExchangeRequest(BaseModel):
  public_token: str = Field(min_length=1)


class PlaidWebhookRequest(BaseModel):
  webhook_type: str = Field(min_length=1)
  webhook_code: str = Field(min_length=1)
  item_id: str = Field(min_length=1)


class SyncSummary(BaseModel):
  accounts_imported: int = 0
  transactions_added: int = 0
  transactions_updated: int = 0
  transactions_removed: int = 0
  status: Literal[
    "success",
    "already_syncing",
    "not_found",
    "requires_reauth",
    "ignored",
    "failed",
  ]
  failure_reason: str | None = None


class PublicTokenExchangeResponse(BaseModel):
  item_id: str
  sync_summary: SyncSummary


class PlaidAccountResponse(BaseModel):
  model_config = ConfigDict(from_attributes=True)

  id: int
  item_id: str
  account_id: str
  name: str
  official_name: str | None = None
  type: str
  subtype: str | None = None
  mask: str | None = None
  current_balance: float | None = None
  available_balance: float | None = None
  credit_limit: float | None = None
  iso_currency_code: str | None = None
  is_active: bool


class NetWorthResponse(BaseModel):
  net_worth: float
  total_assets: float
  total_liabilities: float
  depository_total: float
  credit_total: float
  manual_cash: float = 0.0
  currency: str = "USD"
  account_count: int


class AccountUpdate(BaseModel):
  is_active: bool
