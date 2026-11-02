"""Tool: create a monthly budget for a specific category."""

from typing import Any

import httpx
from pydantic_ai import RunContext

from conversational_agent.models import AgentDeps, BudgetRecord

__all__ = ["create_budget"]


async def create_budget(
  ctx: RunContext[AgentDeps],
  categoryid: int,
  amount: float,
) -> BudgetRecord:
  """Create a new monthly spending budget for a category.

  IMPORTANT: Do not call this tool until the user has explicitly provided all necessary
  information: the specific category and the target monthly dollar amount.

  Args:
    categoryid: The ID of the category from the available categories list.
    amount: The monthly budget limit in dollars (must be greater than 0).
  """
  if amount <= 0:
    raise ValueError("Budget amount must be greater than 0.")

  valid_categories = {cat.categoryid: cat.name for cat in ctx.deps.categories}
  if categoryid not in valid_categories:
    raise ValueError(
      f"Category ID {categoryid} is not valid. Please choose from the available categories."
    )

  async with httpx.AsyncClient(timeout=10) as client:
    response = await client.post(
      f"{ctx.deps.api_base_url}/budgets",
      headers={"Authorization": f"Bearer {ctx.deps.access_token}"},
      json={"categoryid": categoryid, "amount": amount},
    )
    if response.is_error:
      try:
        err_detail = response.json().get("detail", response.text)
      except Exception:
        err_detail = response.text
      raise ValueError(f"Failed to create budget: {err_detail}")
    return BudgetRecord.model_validate(response.json())

