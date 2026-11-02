"""Agent tools – one tool per file, all registered via register_all_tools()."""

from typing import Any

from pydantic_ai import Agent

from conversational_agent.models import AgentDeps
from conversational_agent.tools.create_budget import create_budget
from conversational_agent.tools.lookup_accounts import lookup_accounts
from conversational_agent.tools.lookup_budgets import lookup_budgets
from conversational_agent.tools.lookup_net_worth import lookup_net_worth
from conversational_agent.tools.lookup_spending import lookup_spending

__all__ = [
  "create_budget",
  "lookup_spending",
  "lookup_accounts",
  "lookup_net_worth",
  "lookup_budgets",
  "register_all_tools",
]


def register_all_tools(agent: Agent[AgentDeps, Any]) -> None:
  """Register every tool function with the given pydantic-ai Agent."""
  agent.tool(lookup_spending)
  agent.tool(lookup_accounts)
  agent.tool(lookup_net_worth)
  agent.tool(lookup_budgets)
  agent.tool(create_budget)
