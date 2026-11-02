"""Tool: look up the user's linked bank accounts."""

import httpx
from pydantic import TypeAdapter
from pydantic_ai import RunContext

from conversational_agent.models import AccountRecord, AgentDeps

__all__ = ["lookup_accounts"]


async def lookup_accounts(ctx: RunContext[AgentDeps]) -> list[AccountRecord]:
  """Read the user's linked bank accounts (checking, savings, credit cards) with balances and limits."""
  async with httpx.AsyncClient(timeout=10) as client:
    response = await client.get(
      f"{ctx.deps.api_base_url}/plaid/accounts",
      headers={"Authorization": f"Bearer {ctx.deps.access_token}"},
    )
    response.raise_for_status()
    return TypeAdapter(list[AccountRecord]).validate_python(response.json())
