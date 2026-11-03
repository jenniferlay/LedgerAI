"""Tool: create or update a monthly budget for a category by name."""

from typing import Any

import httpx
from pydantic_ai import RunContext

from conversational_agent.models import AgentDeps, BudgetRecord, CategoryRecord

__all__ = ["create_budget"]


async def create_budget(
  ctx: RunContext[AgentDeps],
  category_name: str,
  amount: float,
) -> BudgetRecord:
  """Create or update a monthly spending budget limit for a category by name.

  If a budget already exists for this category, it will automatically overwrite/update it with the new amount.
  If the category does not yet exist, it will automatically be created.

  Args:
    category_name: The name of the category to budget for (e.g. 'Groceries', 'Coffee', 'Gym').
    amount: The monthly budget limit in dollars (must be greater than 0).
  """
  if amount <= 0:
    raise ValueError("Budget amount must be greater than 0.")

  if not category_name or not category_name.strip():
    raise ValueError("A category name must be provided.")

  norm_name = category_name.strip()

  # Match against existing known categories (case-insensitive) if available
  matched_category = next(
    (c for c in ctx.deps.categories if c.name.lower() == norm_name.lower()),
    None,
  )

  payload: dict[str, Any] = {
    "amount": amount,
    "category_name": matched_category.name if matched_category else norm_name,
    "create_category_if_missing": True,
  }
  if matched_category is not None:
    payload["categoryid"] = matched_category.categoryid

  async with httpx.AsyncClient(timeout=10) as client:
    response = await client.post(
      f"{ctx.deps.api_base_url}/budgets/upsert",
      headers={"Authorization": f"Bearer {ctx.deps.access_token}"},
      json=payload,
    )
    if response.is_error:
      try:
        err_detail = response.json().get("detail", response.text)
      except Exception:
        err_detail = response.text
      raise ValueError(f"Failed to set budget: {err_detail}")

    data = response.json()
    record = BudgetRecord.model_validate(data)

    # Keep agent's in-memory category list up to date if a new category was created
    if record.categoryid not in {cat.categoryid for cat in ctx.deps.categories}:
      ctx.deps.categories.append(
        CategoryRecord(
          categoryid=record.categoryid,
          parent_categoryid=record.parent_categoryid,
          name=record.name,
        )
      )

    return record
