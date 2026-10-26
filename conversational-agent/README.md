# LedgerAI Conversational Agent

A voice- and text-capable AI financial advisor named **Marty**, powered by Pydantic AI and Google Gemini models. The agent connects to the LedgerAI backend API to inspect spending and financial categories for the authenticated user.

## Features

- **Text & Realtime Voice:** Interactive CLI text chat or low-latency streaming voice chat using PyAudio and Gemini Live.
- **Read-Only Spending Intelligence:** Integrates with the LedgerAI backend `GET /expenses` feed and `GET /expenses/categories` endpoints using the user's bearer token.
- **Scoped Context:** Preloads current month dates and active categories so Marty understands the user's budget and category hierarchy without hallucinating.

## Prerequisites

- Python 3.11+
- Working microphone and speaker setup (for `--voice` mode)
- Backend API running (default: `http://127.0.0.1:8000`)
- A valid Gemini API key (`GEMINI_API_KEY`)

## Quick start

From the `conversational-agent` directory:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create a `.env` file in `conversational-agent/`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
API_BASE_URL=http://127.0.0.1:8000
```

### Running the Agent

Start the text interface:

```powershell
python main.py
```

Start the realtime voice interface:

```powershell
python main.py --voice
```

On startup, you will be prompted securely for your LedgerAI user access token (obtained via the mobile app or backend `/auth/login`). The token is used in memory for read-only expense queries and is never logged or exposed.

## Project Structure

```text
conversational-agent/
├── conversational_agent/
│   ├── __init__.py
│   ├── agent.py      # Pydantic AI agent, tool definitions, & context builder
│   ├── cli.py        # Interactive text conversation loop
│   └── voice.py      # Streaming audio I/O & Gemini Live session
├── main.py           # CLI entry point (supports --voice)
├── requirements.txt  # Dependencies (Pydantic AI, Gemini SDK, PyAudio, httpx, etc.)
└── README.md
```
