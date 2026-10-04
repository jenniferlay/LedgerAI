# LedgerAI Backend API

This is the backend service for the LedgerAI application. It provides the API layer for the app and is built with FastAPI.

## Quick start

From the `backend-api` directory:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Then open:

- http://localhost:8000
- http://localhost:8000/docs

## Project structure

```text
backend-api/
├── app/
│   └── main.py
├── .venv/
├── requirements.txt
└── README.md
```

## Notes

- The API currently exposes a simple health-check endpoint at `/`.
- The app is configured to run with FastAPI and reload during development.

This README is intentionally minimal and will be expanded later as the backend grows.
