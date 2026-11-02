"""Tool: look up the user's spending / expense history."""

from datetime import date

import httpx
from pydantic import TypeAdapter
from pydantic_ai import RunContext

from conversational_agent.models import AgentDeps, ExpenseRecord

__all__ = ["lookup_spending"]


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
    return TypeAdapter(list[ExpenseRecord]).validate_python(response.json())
