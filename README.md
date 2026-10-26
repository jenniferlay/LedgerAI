# LedgerAI

**LedgerAI** is a comprehensive personal finance tracking system featuring a cross-platform mobile application, an asynchronous FastAPI backend service, and an intelligent conversational AI financial advisor powered by Google Gemini and Pydantic AI.

---

## Architecture Overview

LedgerAI is structured into three primary sub-projects:

```text
LedgerAI/
├── backend-api/          # FastAPI service with PostgreSQL, SQLAlchemy, & Plaid integration
├── ledgerAI-mobile/      # React Native & Expo mobile client (iOS, Android, Web)
└── conversational-agent/ # Pydantic AI financial advisor (Text CLI & Gemini Live voice)
```

| Component | Technology Stack | Key Responsibilities |
| :--- | :--- | :--- |
| **Mobile Client** (`ledgerAI-mobile`) | React Native, Expo SDK, Expo Router, TypeScript | Intuitive dashboard, transaction logging, category budgets, and Plaid bank linking. |
| **Backend API** (`backend-api`) | FastAPI, PostgreSQL, SQLAlchemy 2 (async), asyncpg, Plaid SDK | Authentication (JWT/Argon2), combined transaction feeds, category management, monthly budget aggregation, Plaid webhook processing. |
| **AI Advisor** (`conversational-agent`) | Python, Pydantic AI, Google Gemini (Gemini Flash & Live), PyAudio | Realtime text and voice personal advisor ("Marty") providing spending inquiries and contextual affordability guidance. |

---

## Core Features

- **Secure Authentication:** User signup and login powered by Argon2 hashing and short-lived HS256 JWT access tokens.
- **Combined Spending Feed:** Real-time visibility into both manual expense entries and auto-synced Plaid bank transactions with search, pagination, and date filtering.
- **Hierarchical Budgets & Categories:** System-wide and user-defined categories with customizable Material icons, parent/child relationships, and monthly budget allocations.
- **Bank Synchronization:** Secure Plaid Link integration (sandbox mode) with encrypted access tokens and webhook update handlers.
- **AI Financial Assistant (Marty):** Hands-free voice conversations and text chat that query live user expenses within verified budget constraints.

---

## Getting Started

### 1. Backend Service (`backend-api`)

1. Set up a Python virtual environment and install dependencies:
   ```powershell
   cd backend-api
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```
2. Initialize database schemas:
   ```powershell
   psql -d <your_database_name> -f db-schemas/setup.sql
   ```
3. Configure environment variables by copying `.env.example` to `.env` and supplying your PostgreSQL connection string and JWT secret.
4. Run the API:
   ```powershell
   python main.py
   ```
   *API will run at http://localhost:8000 (Docs: http://localhost:8000/docs).*

---

### 2. Mobile Application (`ledgerAI-mobile`)

1. Install Node.js packages:
   ```bash
   cd ledgerAI-mobile
   npm install
   ```
2. Configure `.env` from `.env.example` with `EXPO_PUBLIC_API_URL` pointing to your running backend.
3. Start the application:
   ```bash
   npx expo start
   ```
   *Note: For testing native Plaid bank connection, generate a development build using `npx expo run:android` or `npx expo run:ios`.*

---

### 3. Conversational Agent (`conversational-agent`)

1. Set up a Python virtual environment and install dependencies:
   ```powershell
   cd conversational-agent
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```
2. Configure `.env` from `.env.example` with your `GEMINI_API_KEY` and `API_BASE_URL`.
3. Launch text chat or realtime voice mode:
   ```powershell
   # Interactive text chat
   python main.py

   # Realtime voice assistant
   python main.py --voice
   ```

---

## Contributors

- **Shadman Sohel**
- **Jennifer Lay**
- **Ty Tshiamala**
