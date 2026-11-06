import calendar
import os
from datetime import date
from typing import Any

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.budgets.service import list_budgets
from app.category.service import list_categories
from app.chat.schemas import ChatAction, ChatHistoryItem, ChatResponse
from app.core.config import settings
from app.expenses.service import list_expense_feed
from app.plaid.accounts_service import compute_net_worth


def _format_money(amount: float | int) -> str:
  return f"${amount:,.2f}"


async def _gather_user_financial_context(
  db: AsyncSession,
  user_id: int,
) -> dict[str, Any]:
  today = date.today()
  month_start = today.replace(day=1)
  month_end = today.replace(day=calendar.monthrange(today.year, today.month)[1])

  categories = []
  try:
    cat_records = await list_categories(db, user_id)
    categories = [{"id": c.categoryid, "name": c.name} for c in cat_records]
  except Exception:
    pass

  budgets_summary = None
  try:
    budgets_summary = await list_budgets(db, user_id, None)
  except Exception:
    pass

  expenses = []
  try:
    feed = await list_expense_feed(db, user_id, limit=15)
    expenses = [
      {
        "merchant": item.merchant or item.description,
        "amount": item.amount,
        "date": str(item.spent_on),
      }
      for item in feed
    ]
  except Exception:
    pass

  net_worth_val = 0.0
  try:
    nw = await compute_net_worth(db, user_id)
    net_worth_val = float(nw.net_worth)
  except Exception:
    pass

  return {
    "today": str(today),
    "month": f"{today:%B %Y}",
    "month_range": f"{month_start} to {month_end}",
    "net_worth": net_worth_val,
    "categories": categories,
    "budgets": budgets_summary,
    "recent_expenses": expenses,
  }


async def _call_gemini_llm(
  prompt: str,
  history: list[ChatHistoryItem],
  financial_context: dict[str, Any],
  api_key: str,
) -> str | None:
  system_instruction = (
    "Your name is Marty. You are a friendly, down-to-earth personal financial advisor for LedgerAI. "
    "CONVERSATION RULES: "
    "- Do NOT introduce yourself or say 'I am Marty' on every message. Jump straight into answering. "
    "- Respond strictly in plain conversational text without Markdown headers (#), bold (**), or asterisks. "
    "- Write dollar amounts clearly like $45.20 or 45 dollars and 20 cents. "
    "- Keep answers brief, warm, helpful, and natural. "
    f"USER FINANCIAL CONTEXT:\n{financial_context}"
  )

  contents = []
  for h in history[-8:]:
    role = "user" if h.role == "user" else "model"
    contents.append({"role": role, "parts": [{"text": h.content}]})
  contents.append({"role": "user", "parts": [{"text": prompt}]})

  url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key={api_key}"
  payload = {
    "systemInstruction": {"parts": [{"text": system_instruction}]},
    "contents": contents,
  }

  try:
    async with httpx.AsyncClient(timeout=15.0) as client:
      res = await client.post(url, json=payload)
      if res.status_code == 200:
        data = res.json()
        candidates = data.get("candidates", [])
        if candidates:
          parts = candidates[0].get("content", {}).get("parts", [])
          if parts and "text" in parts[0]:
            return parts[0]["text"].strip()
      # If 3.8-flash is 503 or busy, try 3.1-flash-lite
      if res.status_code in (503, 404, 429):
        fallback_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key={api_key}"
        res2 = await client.post(fallback_url, json=payload)
        if res2.status_code == 200:
          data = res2.json()
          candidates = data.get("candidates", [])
          if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            if parts and "text" in parts[0]:
              return parts[0]["text"].strip()
  except Exception:
    pass
  return None


def _generate_rule_based_response(
  message: str,
  context: dict[str, Any],
) -> ChatResponse:
  lower = message.lower()
  net_worth = context.get("net_worth", 0.0)
  budgets = context.get("budgets")
  expenses = context.get("recent_expenses", [])

  if any(kw in lower for kw in ["net worth", "balance", "how much money"]):
    return ChatResponse(
      response=(
        f"Your current total net worth is {_format_money(net_worth)} across your linked accounts. "
        "Keep building that emergency cushion in your savings!"
      ),
      actions=[
        ChatAction(label="View Spending", action="navigate", target="/(app)/(home)"),
        ChatAction(label="View Budgets", action="navigate", target="/(app)/budgets"),
      ],
    )

  if any(kw in lower for kw in ["budget", "limit", "allowance"]):
    if not budgets or not budgets.get("groups"):
      return ChatResponse(
        response=(
          "You haven't set up any monthly budgets yet. Setting target limits for your top categories "
          "is the easiest way to keep your spending in check."
        ),
        actions=[ChatAction(label="Set Up Budgets", action="navigate", target="/(app)/budgets")],
      )

    total_budget = float(budgets.get("total_budget", 0))
    total_spent = float(budgets.get("total_spent", 0))
    remaining = total_budget - total_spent
    text = (
      f"This month you have budgeted {_format_money(total_budget)} and spent {_format_money(total_spent)}, "
      f"leaving you with {_format_money(max(0.0, remaining))} remaining."
    )
    return ChatResponse(
      response=text,
      actions=[ChatAction(label="Manage Budgets", action="navigate", target="/(app)/budgets")],
    )

  if any(kw in lower for kw in ["spent", "spend", "expense", "transaction"]):
    if not expenses:
      return ChatResponse(
        response="You have no recorded expenses yet this period. You can add cash expenses or sync your bank on the Home tab.",
        actions=[ChatAction(label="Add Cash Expense", action="navigate", target="/(app)/add-expense")],
      )

    total = sum(e["amount"] for e in expenses)
    recent_names = [f"{e['merchant']} ({_format_money(e['amount'])})" for e in expenses[:3]]
    text = (
      f"You have spent {_format_money(total)} across your recent transactions. "
      f"Most recent: {', '.join(recent_names)}."
    )
    return ChatResponse(
      response=text,
      actions=[
        ChatAction(label="View All Activity", action="navigate", target="/(app)/(home)"),
        ChatAction(label="Add Cash Expense", action="navigate", target="/(app)/add-expense"),
      ],
    )

  if any(kw in lower for kw in ["hello", "hi", "hey", "who are you"]):
    return ChatResponse(
      response=(
        "Hey! I'm Marty, your financial advisor. I'm here to help you stay on top of your money. "
        "Ask me about your spending, net worth, or monthly budgets."
      ),
      actions=[
        ChatAction(label="Check Net Worth", action="send", target="What is my current net worth?"),
        ChatAction(label="Check Spending", action="send", target="How much did I spend this month?"),
        ChatAction(label="Check Budgets", action="send", target="How are my budgets looking?"),
      ],
    )

  return ChatResponse(
    response=(
      "I'm keeping track of your finances in real time. "
      "You can ask me how much you've spent, what your total net worth is, or how your monthly budgets are tracking."
    ),
    actions=[
      ChatAction(label="Total Spending", action="send", target="How much have I spent?"),
      ChatAction(label="Budget Status", action="send", target="How are my budgets looking?"),
    ],
  )


async def _call_agent_microservice(
  message: str,
  history: list[ChatHistoryItem],
  access_token: str | None,
) -> ChatResponse | None:
  if not access_token:
    return None

  agent_url = f"{settings.agent_service_url.rstrip('/')}/chat"
  headers = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json",
  }
  payload = {
    "message": message,
    "history": [{"role": h.role, "content": h.content} for h in history],
  }

  try:
    async with httpx.AsyncClient(timeout=35.0) as client:
      response = await client.post(agent_url, json=payload, headers=headers)
      if response.status_code == 200:
        data = response.json()
        return ChatResponse(
          response=data.get("response", ""),
          actions=data.get("actions", []),
        )
  except Exception:
    pass
  return None


async def generate_chat_response(
  db: AsyncSession,
  user_id: int,
  message: str,
  history: list[ChatHistoryItem],
  access_token: str | None = None,
) -> ChatResponse:
  # 1. Forward to conversational-agent microservice (runs full Pydantic AI agent with live tools)
  agent_response = await _call_agent_microservice(message, history, access_token)
  if agent_response:
    return agent_response

  # 2. Fall back to direct Gemini LLM call if conversational-agent is offline
  context = await _gather_user_financial_context(db, user_id)
  gemini_key = settings.gemini_api_key or os.getenv("GEMINI_API_KEY")

  if gemini_key:
    llm_text = await _call_gemini_llm(message, history, context, gemini_key)
    if llm_text:
      return ChatResponse(response=llm_text)

  # 3. Rule-based fallback
  return _generate_rule_based_response(message, context)
