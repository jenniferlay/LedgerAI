"""Tool: look up the user's monthly budgets."""

from datetime import date
from typing import Any

import httpx
from pydantic_ai import RunContext

from conversational_agent.models import AgentDeps

__all__ = ["lookup_budgets"]


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
