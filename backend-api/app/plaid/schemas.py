from typing import Literal

from pydantic import BaseModel, Field


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
