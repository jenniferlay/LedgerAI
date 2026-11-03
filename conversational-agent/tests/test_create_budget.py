"""Unit tests for create_budget tool."""

import unittest
from unittest.mock import patch
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
      await create_budget(self.ctx, category_name="Groceries", amount=0)
    self.assertIn("must be greater than 0", str(cm.exception))

    with self.assertRaises(ValueError) as cm:
      await create_budget(self.ctx, category_name="Groceries", amount=-50.0)
    self.assertIn("must be greater than 0", str(cm.exception))

  async def test_empty_category_name(self):
    with self.assertRaises(ValueError) as cm:
      await create_budget(self.ctx, category_name="  ", amount=100.0)
    self.assertIn("category name must be provided", str(cm.exception))

  @patch("httpx.AsyncClient.post")
  async def test_successful_budget_creation_existing_category_name(self, mock_post):
    mock_response = httpx.Response(
      status_code=200,
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
      request=httpx.Request("POST", "http://mock-api/budgets/upsert"),
    )
    mock_post.return_value = mock_response

    # Pass lowercase or matching name
    result = await create_budget(self.ctx, category_name="groceries", amount=250.0)
    self.assertIsInstance(result, BudgetRecord)
    self.assertEqual(result.budgetid, 42)
    self.assertEqual(result.categoryid, 2)
    self.assertEqual(result.name, "Groceries")
    self.assertEqual(result.amount, 250.0)
    self.assertEqual(result.remaining, 250.0)

    # Tool resolves known category ID and canonical name
    mock_post.assert_awaited_once_with(
      "http://mock-api/budgets/upsert",
      headers={"Authorization": "Bearer test-token"},
      json={
        "amount": 250.0,
        "category_name": "Groceries",
        "create_category_if_missing": True,
        "categoryid": 2,
      },
    )

  @patch("httpx.AsyncClient.post")
  async def test_successful_budget_creation_brand_new_category(self, mock_post):
    mock_response = httpx.Response(
      status_code=200,
      json={
        "budgetid": 99,
        "categoryid": 10,
        "parent_categoryid": None,
        "name": "Boba",
        "icon": "category",
        "amount": 50.0,
        "spent": 0.0,
        "remaining": 50.0,
      },
      request=httpx.Request("POST", "http://mock-api/budgets/upsert"),
    )
    mock_post.return_value = mock_response

    result = await create_budget(self.ctx, category_name="Boba", amount=50.0)
    self.assertIsInstance(result, BudgetRecord)
    self.assertEqual(result.budgetid, 99)
    self.assertEqual(result.categoryid, 10)
    self.assertEqual(result.name, "Boba")

    mock_post.assert_awaited_once_with(
      "http://mock-api/budgets/upsert",
      headers={"Authorization": "Bearer test-token"},
      json={
        "amount": 50.0,
        "category_name": "Boba",
        "create_category_if_missing": True,
      },
    )

    # Verify newly created category is appended to ctx.deps.categories
    cat_names = [c.name for c in self.ctx.deps.categories]
    self.assertIn("Boba", cat_names)

  @patch("httpx.AsyncClient.post")
  async def test_backend_error_handling(self, mock_post):
    mock_response = httpx.Response(
      status_code=422,
      json={"detail": "Subcategory budgets would exceed the parent budget"},
      request=httpx.Request("POST", "http://mock-api/budgets/upsert"),
    )
    mock_post.return_value = mock_response

    with self.assertRaises(ValueError) as cm:
      await create_budget(self.ctx, category_name="Groceries", amount=25000.0)
    self.assertIn("Subcategory budgets would exceed the parent budget", str(cm.exception))


if __name__ == "__main__":
  unittest.main()
