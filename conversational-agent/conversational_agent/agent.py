import calendar
import getpass
import os
from dataclasses import dataclass
from datetime import date
from typing import Any

import httpx
import pydantic_ai
from dotenv import load_dotenv
from pydantic import BaseModel, TypeAdapter
from pydantic_ai import Agent, RunContext

pydantic_ai.BANNER_ENABLED = False
load_dotenv()


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


@dataclass(frozen=True)
class AgentDeps:
  api_base_url: str
  access_token: str
  categories: list[CategoryRecord]


def financial_context(categories: list[CategoryRecord]) -> str:
  today = date.today()
  month_start = today.replace(day=1)
  month_end = today.replace(day=calendar.monthrange(today.year, today.month)[1])
  category_lines = "\n".join(
    f"- ID {category.categoryid}: {category.name}"
    + (
      f" (subcategory of ID {category.parent_categoryid})"
      if category.parent_categoryid is not None
      else ""
    )
    for category in categories
  )
  if not category_lines:
    category_lines = "- No categories were returned."

  return (
    f"Current local date: {today.isoformat()}.\n"
    f"Current month: {today:%B %Y} ({today:%Y-%m}).\n"
    f"Current month date range: {month_start.isoformat()} through {month_end.isoformat()}.\n"
    "For month-to-date, query from the first day of the current month through today's date. "
    "For a completed month, use that month's actual calendar start and end dates. "
    "Use only category IDs listed below; category filters match that exact category, not its "
    "child categories. Never guess a category ID.\n"
    f"Available categories:\n{category_lines}"
  )


advisor_agent = Agent(
  "google:gemini-3.1-flash-lite",
  deps_type=AgentDeps,
  system_prompt=(
    "Your name is Marty. Always introduce yourself as Marty if asked who you are. "
    "You are a friendly, down-to-earth personal financial advisor. "
    "You have tools to inspect the user's spending history (`lookup_spending`), linked bank accounts and balances "
    "(`lookup_accounts`), total net worth (`lookup_net_worth`), and monthly budgets (`lookup_budgets`). "
    "Always retrieve the user's actual data before discussing their finances. "
    "Understand the nuance between accounts: checking is everyday spending cash, savings is reserve wealth, "
    "and credit cards are revolving debt with limits and utilization. "
    "Transfers between checking and savings or credit card payments are internal money movements, not living expenses. "
    "Never invent transactions, totals, categories, balances, or dates. Explain when returned records do not "
    "contain enough information to answer. "
    "Keep your answers brief, warm, and conversational so they sound natural spoken aloud."
  ),
)


@advisor_agent.instructions
def add_current_financial_context(ctx: RunContext[AgentDeps]) -> str:
  return financial_context(ctx.deps.categories)


@advisor_agent.tool
async def lookup_spending(
  ctx: RunContext[AgentDeps],
  start_date: date | None = None,
  end_date: date | None = None,
  categoryid: int | None = None,
  merchant: str | None = None,
) -> list[ExpenseRecord]:
  """Read up to 40 of the signed-in user's expenses with optional date, category-ID, and merchant filters."""
  if start_date is not None and end_date is not None and start_date > end_date:
    raise ValueError("start_date must be on or before end_date")

  params = {
    key: value
    for key, value in {
      "start_date": start_date,
      "end_date": end_date,
      "categoryid": categoryid,
      "merchant": merchant,
      "limit": 40,
    }.items()
    if value is not None
  }

  async with httpx.AsyncClient(timeout=10) as client:
    response = await client.get(
      f"{ctx.deps.api_base_url}/expenses",
      headers={"Authorization": f"Bearer {ctx.deps.access_token}"},
      params=params,
    )
    response.raise_for_status()
    ret = TypeAdapter(list[ExpenseRecord]).validate_python(response.json())
    return ret


@advisor_agent.tool
async def lookup_accounts(ctx: RunContext[AgentDeps]) -> list[AccountRecord]:
  """Read the user's linked bank accounts (checking, savings, credit cards) with balances and limits."""
  async with httpx.AsyncClient(timeout=10) as client:
    response = await client.get(
      f"{ctx.deps.api_base_url}/plaid/accounts",
      headers={"Authorization": f"Bearer {ctx.deps.access_token}"},
    )
    response.raise_for_status()
    return TypeAdapter(list[AccountRecord]).validate_python(response.json())


@advisor_agent.tool
async def lookup_net_worth(ctx: RunContext[AgentDeps]) -> NetWorthRecord:
  """Get the user's current net worth, total assets (checking/savings/investments), and total liabilities (credit cards/loans)."""
  async with httpx.AsyncClient(timeout=10) as client:
    response = await client.get(
      f"{ctx.deps.api_base_url}/plaid/accounts/net-worth",
      headers={"Authorization": f"Bearer {ctx.deps.access_token}"},
    )
    response.raise_for_status()
    return TypeAdapter(NetWorthRecord).validate_python(response.json())


@advisor_agent.tool
async def lookup_budgets(
  ctx: RunContext[AgentDeps],
  month: date | None = None,
) -> dict[str, Any]:
  """Read the user's monthly budget limits, actual spending by category, remaining budget, and days remaining."""
  params = {}
  if month is not None:
    params["month"] = month.isoformat()
  async with httpx.AsyncClient(timeout=10) as client:
    response = await client.get(
      f"{ctx.deps.api_base_url}/budgets",
      headers={"Authorization": f"Bearer {ctx.deps.access_token}"},
      params=params,
    )
    response.raise_for_status()
    return response.json()


async def get_agent_deps() -> AgentDeps:
  access_token = getpass.getpass("LedgerAI access token: ").strip()
  if not access_token:
    raise ValueError("An access token is required to query your expenses.")

  api_base_url = os.getenv("API_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
  async with httpx.AsyncClient(timeout=10) as client:
    response = await client.get(
      f"{api_base_url}/expenses/categories",
      headers={"Authorization": f"Bearer {access_token}"},
    )
    response.raise_for_status()
    categories = TypeAdapter(list[CategoryRecord]).validate_python(response.json())

  return AgentDeps(
    api_base_url=api_base_url,
    access_token=access_token,
    categories=categories,
  )
