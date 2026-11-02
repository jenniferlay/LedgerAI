"""Tool: look up the user's current net worth."""

import httpx
from pydantic import TypeAdapter
from pydantic_ai import RunContext

from conversational_agent.models import AgentDeps, NetWorthRecord

__all__ = ["lookup_net_worth"]


async def lookup_net_worth(ctx: RunContext[AgentDeps]) -> NetWorthRecord:
  """Get the user's current net worth, total assets (checking/savings/investments), and total liabilities (credit cards/loans)."""
  async with httpx.AsyncClient(timeout=10) as client:
    response = await client.get(
      f"{ctx.deps.api_base_url}/plaid/accounts/net-worth",
      headers={"Authorization": f"Bearer {ctx.deps.access_token}"},
    )
    response.raise_for_status()
    return TypeAdapter(NetWorthRecord).validate_python(response.json())
