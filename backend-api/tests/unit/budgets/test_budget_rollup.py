from datetime import date
from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy.dialects import postgresql

from app.budgets.service import _fetch_budgets, _spend_subquery


def test_spend_subquery_uses_signed_amounts_and_effective_plaid_categories() -> None:
	statement = _spend_subquery(
		user_id=7,
		start=date(2026, 5, 1),
		end=date(2026, 6, 1),
	).select()
	sql = str(statement.compile(dialect=postgresql.dialect()))

	assert "expenses.amount" in sql
	assert "plaid_transactions.amount" in sql
	assert "categories.plaid_code" in sql
	assert "plaid_transactions.categoryid" in sql
	assert "plaid_transactions.hidden IS false" in sql
	assert "plaid_transactions.amount <" not in sql


@pytest.mark.asyncio
async def test_budget_query_rolls_parent_categories_into_child_spend() -> None:
	db = MagicMock()
	result = MagicMock()
	result.mappings.return_value.all.return_value = []
	db.execute = AsyncMock(return_value=result)

	await _fetch_budgets(
		db,
		user_id=7,
		start=date(2026, 5, 1),
		end=date(2026, 6, 1),
	)

	statement = db.execute.await_args.args[0]
	sql = str(statement.compile(dialect=postgresql.dialect()))
	assert "categories_1.parent_categoryid = budgets.categoryid" in sql
	assert "spend.categoryid = categories_1.categoryid" in sql
	assert "spend.category_userid = categories_1.userid" in sql
