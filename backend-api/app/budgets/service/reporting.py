from datetime import date
from decimal import Decimal
from typing import Any, Mapping

from sqlalchemy.ext.asyncio import AsyncSession

from app.budgets.service.spend import (
	_fetch_budgets,
	_fetch_parents,
	_month_bounds,
	_uncategorized_spent,
)
from app.category.models import Category


def _to_item(row: Mapping[str, Any]) -> dict[str, Any]:
	"""Convert a database query row mapping to a response dict."""
	amount: Decimal = row["amount"]
	spent: Decimal = row["spent"]
	return {
		"budgetid": row["budgetid"],
		"categoryid": row["categoryid"],
		"parent_categoryid": row["parent_categoryid"],
		"name": row["name"],
		"icon": row["icon"],
		"amount": float(amount),
		"spent": float(spent),
		"remaining": float(amount - spent),
	}


def _build_groups(
	rows: list[Mapping[str, Any]], parents: dict[int, Category]
) -> list[dict[str, Any]]:
	"""Nest budgets: one group per top-level category, subcategory budgets as children.

	A group with its own budget uses that budget's limit/spent (which already include
	its subcategories). A group without one is only a container, so its limit/spent
	are the sum of its children.
	"""
	groups: dict[int, dict[str, Any]] = {}

	def standalone(row: Mapping[str, Any]) -> dict[str, Any]:
		return {
			"id": row["categoryid"],
			"budgetid": row["budgetid"],
			"name": row["name"],
			"icon": row["icon"],
			"spent": row["spent"],
			"limit": row["amount"],
			"children": [],
		}

	for row in rows:
		if row["parent_categoryid"] is None:
			groups[row["categoryid"]] = standalone(row)

	for row in rows:
		parent_id = row["parent_categoryid"]
		if parent_id is None:
			continue
		if parent_id not in groups:
			parent = parents.get(parent_id)
			if parent is None:  # parent vanished: show the budget on its own
				groups[row["categoryid"]] = standalone(row)
				continue
			groups[parent_id] = {
				"id": parent.categoryid,
				"budgetid": None,
				"name": parent.name,
				"icon": parent.icon,
				"spent": Decimal(0),
				"limit": Decimal(0),
				"children": [],
			}
		groups[parent_id]["children"].append(
			{
				"id": row["categoryid"],
				"budgetid": row["budgetid"],
				"name": row["name"],
				"icon": row["icon"],
				"spent": row["spent"],
				"limit": row["amount"],
			}
		)

	for group in groups.values():
		if group["budgetid"] is None:
			group["spent"] = sum((c["spent"] for c in group["children"]), Decimal(0))
			group["limit"] = sum((c["limit"] for c in group["children"]), Decimal(0))

	return sorted(groups.values(), key=lambda g: g["name"])


def _group_out(group: dict[str, Any]) -> dict[str, Any]:
	"""Format a group structure with float numeric fields for schema validation."""
	return {
		**group,
		"spent": float(group["spent"]),
		"limit": float(group["limit"]),
		"children": [
			{**c, "spent": float(c["spent"]), "limit": float(c["limit"])}
			for c in group["children"]
		],
	}


async def _get_budget_item(
	db: AsyncSession, user_id: int, budgetid: int
) -> dict[str, Any]:
	"""Fetch a single budget item with its current month spent and remaining amounts."""
	start, end = _month_bounds(None)
	rows = await _fetch_budgets(db, user_id, start, end, budgetid=budgetid)
	if not rows:
		raise ValueError(f"Budget with id {budgetid} not found for user {user_id}")
	return _to_item(rows[0])


async def get_budget(
	db: AsyncSession, user_id: int, budgetid: int, month: date | None = None
) -> dict[str, Any] | None:
	"""Fetch details and progress for a single budget in the given month."""
	start, end = _month_bounds(month)
	rows = await _fetch_budgets(db, user_id, start, end, budgetid=budgetid)
	return _to_item(rows[0]) if rows else None


async def list_budgets(
	db: AsyncSession, user_id: int, month: date | None = None
) -> dict[str, Any]:
	"""Summarize monthly category budgets, spending, and uncategorized expenses."""
	start, end = _month_bounds(month)
	rows = await _fetch_budgets(db, user_id, start, end)
	uncategorized = await _uncategorized_spent(db, user_id, start, end)

	top_ids = {r["categoryid"] for r in rows if r["parent_categoryid"] is None}
	missing = {
		r["parent_categoryid"] for r in rows if r["parent_categoryid"] is not None
	} - top_ids
	parents = await _fetch_parents(db, missing, user_id=user_id)
	groups = _build_groups(rows, parents)

	# Each group's limit/spent is exactly what counts toward the totals: children
	# of a budgeted parent are already inside it, so nothing is double counted.
	total_budget = sum((g["limit"] for g in groups), Decimal(0))
	total_spent = sum((g["spent"] for g in groups), Decimal(0))

	today = date.today()
	days_remaining = (end - today).days if start <= today < end else 0

	return {
		"month": start,
		"total_budget": float(total_budget),
		"total_spent": float(total_spent),
		"total_remaining": float(total_budget - total_spent),
		"uncategorized_spent": float(uncategorized),
		"days_remaining": days_remaining,
		"groups": [_group_out(g) for g in groups],
	}

