"""Unit tests for create_budget tool."""

import unittest
from unittest.mock import AsyncMock, patch
import httpx
from pydantic_ai import RunContext

from conversational_agent.models import AgentDeps, CategoryRecord, BudgetRecord
from conversational_agent.tools.create_budget import create_budget


class TestCreateBudget(unittest.IsolatedAsyncioTestCase):
  def setUp(self):
    self.categories = [
      CategoryRecord(categoryid=1, parent_categoryid=None, name="Food & Dining"),
      CategoryRecord(categoryid=2, parent_categoryid=1, name="Groceries"),
    ]
    self.deps = AgentDeps(
      api_base_url="http://mock-api",
      access_token="test-token",
      categories=self.categories,
    )
    self.ctx = RunContext(
      deps=self.deps,
      model=None,
      usage=None,
      prompt=None,
    )

  async def test_invalid_amount_zero_or_negative(self):
    with self.assertRaises(ValueError) as cm:
      await create_budget(self.ctx, categoryid=1, amount=0)
    self.assertIn("must be greater than 0", str(cm.exception))

    with self.assertRaises(ValueError) as cm:
      await create_budget(self.ctx, categoryid=1, amount=-50.0)
    self.assertIn("must be greater than 0", str(cm.exception))

  async def test_invalid_category_id(self):
    with self.assertRaises(ValueError) as cm:
      await create_budget(self.ctx, categoryid=999, amount=100.0)
    self.assertIn("not valid", str(cm.exception))

  @patch("httpx.AsyncClient.post")
  async def test_successful_budget_creation(self, mock_post):
    mock_response = httpx.Response(
      status_code=201,
      json={
        "budgetid": 42,
        "categoryid": 2,
        "parent_categoryid": 1,
        "name": "Groceries",
        "icon": "cart",
        "amount": 250.0,
        "spent": 0.0,
        "remaining": 250.0,
      },
      request=httpx.Request("POST", "http://mock-api/budgets"),
    )
    mock_post.return_value = mock_response

    result = await create_budget(self.ctx, categoryid=2, amount=250.0)
    self.assertIsInstance(result, BudgetRecord)
    self.assertEqual(result.budgetid, 42)
    self.assertEqual(result.categoryid, 2)
    self.assertEqual(result.name, "Groceries")
    self.assertEqual(result.amount, 250.0)
    self.assertEqual(result.remaining, 250.0)

    mock_post.assert_awaited_once_with(
      "http://mock-api/budgets",
      headers={"Authorization": "Bearer test-token"},
      json={"categoryid": 2, "amount": 250.0},
    )

  @patch("httpx.AsyncClient.post")
  async def test_backend_error_handling(self, mock_post):
    mock_response = httpx.Response(
      status_code=409,
      json={"detail": "A budget already exists for this category"},
      request=httpx.Request("POST", "http://mock-api/budgets"),
    )
    mock_post.return_value = mock_response

    with self.assertRaises(ValueError) as cm:
      await create_budget(self.ctx, categoryid=2, amount=250.0)
    self.assertIn("A budget already exists for this category", str(cm.exception))


if __name__ == "__main__":
  unittest.main()

