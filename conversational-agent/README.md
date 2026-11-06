# LedgerAI Conversational Agent

A voice- and text-capable AI financial advisor named **Marty**, powered by Pydantic AI, Google Gemini, and Deepgram. The agent connects to the LedgerAI backend API to inspect spending, accounts, net worth, and monthly budgets for the authenticated user.

## Features

- **Text & Voice Options:**
  - Interactive CLI text chat (`python main.py`).
  - Low-latency end-to-end multimodal speech-to-speech (`python main.py --voice`).
  - **Non-multimodal pipeline (`python main.py --voice --nomodal`):** Deepgram Nova-2 (STT) + Marty Agent (Gemini Flash) + Deepgram Aura (TTS) for ultra-low latency, natural conversational audio, and fractions of a cent per turn.
- **Read-Only Financial Intelligence:** Integrates with LedgerAI backend endpoints:
  - `GET /expenses` (Spending feed)
  - `GET /categories` (Category hierarchy)
  - `GET /plaid/accounts` (Bank & credit accounts)
  - `GET /plaid/accounts/net-worth` (Real-time net worth)
  - `GET /budgets` (Monthly category limits & rollups)

## Prerequisites

- Python 3.11+
- Working microphone and speaker setup (for voice modes)
- Backend API running (default: `http://127.0.0.1:8000`)
- Valid API keys:
  - `GEMINI_API_KEY` (for Gemini reasoning and Gemini Live)
  - `DEEPGRAM_API_KEY` (for `--nomodal` voice mode)

## Quick Start

From the `conversational-agent` directory:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create a `.env` file in `conversational-agent/` (refer to `.env.example`):

```env
GEMINI_API_KEY=your_gemini_api_key_here
REALTIME_MODEL=google:gemini-3.8-live
TEXT_MODEL=google:gemini-3.8-flash

# Deepgram (for --nomodal mode)
DEEPGRAM_API_KEY=your_deepgram_api_key_here

API_BASE_URL=http://127.0.0.1:8000
```

### Running the Agent

1. **HTTP Microservice for Web/Mobile UI (Port 8001):**
   ```powershell
   python main.py --server
   ```

2. **Interactive CLI Text Chat:**
   ```powershell
   python main.py
   ```

3. **Non-Multimodal Voice (Deepgram STT -> Marty -> Deepgram TTS):**
   ```powershell
   python main.py --voice --nomodal
   ```

4. **Multimodal Realtime Voice (Gemini Live / OpenAI Realtime):**
   ```powershell
   python main.py --voice
   ```

## Project Structure

```text
conversational-agent/
├── conversational_agent/
│   ├── __init__.py
│   ├── agent.py          # Pydantic AI agent, tool definitions, & context builder
│   ├── cli.py            # Interactive text conversation loop
│   ├── nomodal_voice.py  # Deepgram STT -> Marty Agent -> Deepgram Aura TTS pipeline
│   └── voice.py          # Realtime multimodal speech-to-speech session
├── main.py               # CLI entry point (--voice, --nomodal)
├── requirements.txt      # Dependencies
└── README.md
```
