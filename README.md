# LedgerAI

**LedgerAI** is a cross-platform mobile application designed to help users seamlessly log daily expenses, manage monthly category budgets, and visualize historical spending habits—complete with a conversational AI assistant for personalized financial guidance.

## Core Features
- **Authentication:** Secure account registration, login, and session management.
- **Expense Tracking:** Fast daily expense logging with category assignment.
- **Budget Management:** Monthly category limits, real-time remaining balance dashboard, and proactive 90% threshold alerts.
- **Spending Analytics:** Visual breakdown charts and custom date-range filtering.
- **AI Financial Assistant:** Conversational agent providing weekly spending summaries and real-time affordability advice.

## Conversational agent

The `conversational-agent` process reads expenses through the authenticated, read-only `GET /expenses` endpoint. From the `conversational-agent` directory, run `python main.py` for text chat or `python main.py --voice` for realtime voice. The agent prompts for a login access token without echoing it. The token stays in the agent's per-run dependencies and is sent only as the bearer token for expense lookups. The agent tool cannot create, update, or delete expenses and fetches at most the latest 100 matching records.

Set `API_BASE_URL` in the agent's environment (or its local `.env`) to the backend URL if it is not `http://127.0.0.1:8000`.

Agent code is grouped by responsibility under `conversational-agent/conversational_agent/`: `agent.py` defines the agent and its API tool, `cli.py` runs text chat, and `voice.py` runs voice chat. The top-level `main.py` is the small entry point.

## Contributors
- **Shadman Sohel**
- **Jennifer Lay**
- **Ty Tshiamala**