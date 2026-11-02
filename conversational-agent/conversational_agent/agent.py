import calendar
import getpass
import os
from datetime import date

import httpx
import pydantic_ai
from dotenv import load_dotenv
from pydantic import TypeAdapter
from pydantic_ai import Agent, RunContext

from conversational_agent.models import (
  AccountRecord,
  AgentDeps,
  BudgetRecord,
  CategoryRecord,
  ExpenseRecord,
  NetWorthRecord,
)
from conversational_agent.tools import (
  create_budget,
  lookup_accounts,
  lookup_budgets,
  lookup_net_worth,
  lookup_spending,
  register_all_tools,
)

pydantic_ai.BANNER_ENABLED = False
load_dotenv()


def financial_context(categories: list[CategoryRecord]) -> str:
  today = date.today()
  month_start = today.replace(day=1)
  month_end = today.replace(day=calendar.monthrange(today.year, today.month)[1])
  category_lines = "\n".join(
    f"- ID {category.categoryid}: {category.name}"
    + (
      f" (subcategory of ID {category.parent_categoryid})"
      if category.parent_categoryid is not None
      else ""
    )
    for category in categories
  )
  if not category_lines:
    category_lines = "- No categories were returned."

  return (
    f"Current local date: {today.isoformat()}.\n"
    f"Current month: {today:%B %Y} ({today:%Y-%m}).\n"
    f"Current month date range: {month_start.isoformat()} through {month_end.isoformat()}.\n"
    "For month-to-date, query from the first day of the current month through today's date. "
    "For a completed month, use that month's actual calendar start and end dates. "
    "Use only category IDs listed below; category filters match that exact category, not its "
    "child categories. Never guess a category ID.\n"
    f"Available categories:\n{category_lines}"
  )


text_model_name = os.getenv("TEXT_MODEL")
if not text_model_name:
  raise ValueError(
    "TEXT_MODEL is not set in your .env file. "
    "Please set TEXT_MODEL in conversational-agent/.env "
    "(e.g. TEXT_MODEL=google:gemini-3.8-flash or TEXT_MODEL=openai:gpt-4o-mini)."
  )

advisor_agent = Agent(
  text_model_name,
  deps_type=AgentDeps,
  system_prompt=(
    "Your name is Marty. You are a friendly, down-to-earth personal financial advisor. "
    "CONVERSATION RULES: "
    "- Do NOT introduce yourself or say 'I'm Marty' on every message. Jump straight into answering the user's question. "
    "- ONLY say your name on the very first turn IF the user specifically asks who you are or what your name is. "
    "FINANCIAL TOOLS & DATA: "
    "- You have tools to inspect the user's spending history (`lookup_spending`), linked bank accounts and balances "
    "(`lookup_accounts`), total net worth (`lookup_net_worth`), monthly budgets (`lookup_budgets`), and create a new monthly budget (`create_budget`). "
    "- Always retrieve the user's actual data before discussing their finances. "
    "- Understand the nuance between accounts: checking is everyday spending cash, savings is reserve wealth, "
    "and credit cards are revolving debt with limits and utilization. "
    "- Transfers between checking and savings or credit card payments are internal money movements, not living expenses. "
    "- Never invent transactions, totals, categories, balances, or dates. Explain when returned records do not "
    "contain enough information to answer. "
    "BUDGET CREATION RULES: "
    "- When the user wants to create or set a budget, you MUST gather all necessary information before calling `create_budget`: "
    "  1. The category: match the user's request to an exact category ID from the available categories list. If the user's request is ambiguous or they haven't named a category, ask them which category they would like to budget for. "
    "  2. The budget amount: the target monthly spending limit in dollars (must be a positive amount). If the user has not specified an amount, ask them how much they want to set as the monthly limit. "
    "- NEVER call `create_budget` with assumed, guessed, or default categories or amounts. If any necessary detail is missing or ambiguous, ask the user conversationally to provide it before calling the tool. "
    "- Once you have both the category and the dollar amount explicitly from the user, invoke `create_budget` and confirm the newly created budget to the user warmly. "
    "CRITICAL SPEECH REQUIREMENTS: "
    "- Always respond strictly in plain conversational text. "
    "- Never use Markdown formatting like asterisks (** or *), hashes (#), bullet points (- or *), code blocks, or bold text. "
    "- Write out numbers and currency clearly and simply (e.g. '$45.20' or '45 dollars and 20 cents'). "
    "- Keep your answers brief, warm, and natural so they sound effortless spoken aloud."
  ),
)


@advisor_agent.instructions
def add_current_financial_context(ctx: RunContext[AgentDeps]) -> str:
  return financial_context(ctx.deps.categories)


# Register all tools from conversational_agent.tools
register_all_tools(advisor_agent)


async def get_agent_deps() -> AgentDeps:
  access_token = (os.getenv("LEDGERAI_ACCESS_TOKEN") or os.getenv("ACCESS_TOKEN") or "").strip()
  if not access_token:
    access_token = getpass.getpass("LedgerAI access token: ").strip()
  if not access_token:
    raise ValueError("An access token is required to query your expenses.")

  api_base_url = os.getenv("API_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
  headers = {"Authorization": f"Bearer {access_token}"}
  async with httpx.AsyncClient(timeout=10) as client:
    response = await client.get(f"{api_base_url}/categories", headers=headers)
    if response.status_code == 404:
      response = await client.get(f"{api_base_url}/expenses/categories", headers=headers)
    response.raise_for_status()
    categories = TypeAdapter(list[CategoryRecord]).validate_python(response.json())

  return AgentDeps(
    api_base_url=api_base_url,
    access_token=access_token,
    categories=categories,
  )


__all__ = [
  "AccountRecord",
  "AgentDeps",
  "BudgetRecord",
  "CategoryRecord",
  "ExpenseRecord",
  "NetWorthRecord",
  "add_current_financial_context",
  "advisor_agent",
  "create_budget",
  "financial_context",
  "get_agent_deps",
  "lookup_accounts",
  "lookup_budgets",
  "lookup_net_worth",
  "lookup_spending",
  "register_all_tools",
]
