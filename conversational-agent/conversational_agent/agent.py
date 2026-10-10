import getpass
import os
from dataclasses import dataclass
from datetime import date

import httpx
import pydantic_ai
from dotenv import load_dotenv
from pydantic import BaseModel, TypeAdapter
from pydantic_ai import Agent, RunContext

pydantic_ai.BANNER_ENABLED = False
load_dotenv()


@dataclass(frozen=True)
class AgentDeps:
  api_base_url: str
  access_token: str


class ExpenseRecord(BaseModel):
  expenseid: int
  categoryid: int | None
  amount_dollars: int
  amount_cents: int
  note: str
  merchant: str | None
  spent_on: date


advisor_agent = Agent(
  "google:gemini-3.1-flash-lite",
  deps_type=AgentDeps,
  system_prompt=(
    "Your name is Marty. Always introduce yourself as Marty if asked who you are. "
    "You are a friendly, down-to-earth personal financial advisor. "
    "Use `lookup_spending` to retrieve the user's actual expenses before discussing their spending. "
    "Never invent transactions, totals, categories, or dates. Explain when returned records do not "
    "contain enough information to answer. The lookup returns at most the latest 100 matching "
    "expenses, so do not present a partial result as a complete total. "
    "Keep your answers brief, warm, and conversational so they sound natural spoken aloud."
  ),
)


@advisor_agent.tool
async def lookup_spending(
  ctx: RunContext[AgentDeps],
  start_date: date | None = None,
  end_date: date | None = None,
  categoryid: int | None = None,
  merchant: str | None = None,
) -> list[ExpenseRecord]:
  """Read up to 100 of the signed-in user's expenses with optional date, category-ID, and merchant filters."""
  if start_date is not None and end_date is not None and start_date > end_date:
    raise ValueError("start_date must be on or before end_date")

  params = {
    key: value
    for key, value in {
      "start_date": start_date,
      "end_date": end_date,
      "categoryid": categoryid,
      "merchant": merchant,
      "limit": 100,
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
    return TypeAdapter(list[ExpenseRecord]).validate_python(response.json())


def get_agent_deps() -> AgentDeps:
  access_token = getpass.getpass("LedgerAI access token: ").strip()
  if not access_token:
    raise ValueError("An access token is required to query your expenses.")

  api_base_url = os.getenv("API_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
  return AgentDeps(api_base_url=api_base_url, access_token=access_token)
