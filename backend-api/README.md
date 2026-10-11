# LedgerAI Backend API

This is the backend service for the LedgerAI application. It provides the API layer for the app and is built with FastAPI.

## Quick start

From the `backend-api` directory:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
# Set DATABASE_URL in .env to your PostgreSQL connection string.
python main.py
```

Run the command from the `backend-api` directory. The app reads its configuration from `.env`. The development entry point binds to `0.0.0.0` on port `8000`, allowing a phone on the same reachable network to connect; use this setup only for development.

Then open:

- http://localhost:8000
- http://localhost:8000/docs

## Tests

From the `backend-api` directory, install the development dependencies and run the unit tests:

```powershell
pip install -r requirements-dev.txt
python -m pytest
```

## Project structure

```text
backend-api/
├── app/
│   ├── db/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   └── database.py
│   ├── auth/
│   │   ├── models.py
│   │   ├── routes.py
│   │   ├── schemas.py
│   │   └── security.py
│   └── expenses/
│       ├── models.py
│       ├── routes.py
│       ├── schemas.py
│       └── service.py
├── tests/
│   └── unit/
│       └── expenses/
│           └── test_service.py
├── main.py
├── pytest.ini
├── requirements-dev.txt
├── sql/
│   └── users.sql
├── .env.example
├── .venv/
├── requirements.txt
└── README.md
```

## Database connections

- `app.db.database` creates an asynchronous SQLAlchemy engine and `SessionLocal` from `DATABASE_URL`, using asyncpg.
- Plain PostgreSQL URLs are configured to require SSL. Existing `sslmode` query settings are translated to asyncpg's `ssl` option.
- Inject a request-scoped session into route handlers with `from app.db.database import get_db` and `db: AsyncSession = Depends(get_db)`.
- The `get_db` dependency always closes its session, including when a request fails. Commit or roll back explicitly in the service or route that owns each transaction.
- `Base` in `app.db.base` is the shared declarative base for ORM models. Apply schema changes through migrations or reviewed SQL scripts; the API does not create or alter tables at startup.
- Run `sql/users.sql`, then `sql/category.sql`, then `sql/expense.sql`. Expenses store both the category ID and its owner ID; the composite foreign key ensures that the category is global or belongs to the expense owner, including for direct SQL writes.
- Keep `.env` out of version control. `.env.example` contains only a placeholder.

## Authentication

- `POST /auth/signup` accepts JSON with an `email`, `username`, and `password`. Passwords must be at least 8 characters and contain uppercase and lowercase letters and a number.
- `POST /auth/login` accepts JSON with an `email` and `password`, checks the user against the existing `users` table, and returns a 7-day HS256 bearer token.
- For development, CORS allows all origins by default so Expo Go on a phone can reach the API. Set `CORS_ORIGINS` to a comma-separated list of trusted origins to restrict browser access when deploying. Credentials remain disabled.
- `POST /expenses` accepts JSON expense details and requires a bearer token. The expense owner is taken from the verified token; clients must not provide a user ID. If `categoryid` is omitted, it defaults to `1` (the system-wide General category). The API only accepts global or caller-owned categories, and the composite foreign key enforces the same ownership rule for direct SQL writes.
- `GET /expenses` requires a bearer token and returns only the caller's expenses, newest first. Optional `start_date` and `end_date` filters are inclusive; `categoryid` filters by category; `merchant` performs a case-insensitive substring search. Results are paginated with `limit` (default `100`, maximum `500`) and `offset` (default `0`).
- `GET /expenses/categories` requires a bearer token and returns global and caller-owned categories with IDs and parent IDs.
- `POST /plaid/link-token` requires a bearer token and creates a Plaid Link token for the authenticated user. Configure `PLAID_CLIENT_ID`, `PLAID_SECRET`, and `PLAID_ENV=sandbox` in `.env`; no Plaid credentials are required until a Plaid endpoint is used.
- `POST /plaid/exchange` requires a bearer token and accepts `{"public_token":"..."}` from Plaid Link. It stores the resulting item, immediately runs its initial transaction sync, and returns the `item_id` plus a `sync_summary`. If the initial sync fails, the item is still linked and the response includes a failed sync status so the client can retry using the manual sync endpoint.
- `POST /plaid/items/{item_id}/sync` requires a bearer token and imports the item's transaction changes. The response includes transaction added, updated, and removed counts; a `requires_reauth` status means the client should request an Update Mode link token from `POST /plaid/items/{item_id}/update-link-token`.
- `POST /plaid/webhooks` accepts Plaid `TRANSACTIONS` / `SYNC_UPDATES_AVAILABLE` notifications, verifies the `Plaid-Verification` JWT signature and request-body hash, and syncs only items already stored by the backend. Configure Plaid to use this endpoint as the webhook URL.
- Plaid is configured for sandbox only. The server uses the official `plaid-python` SDK and does not log public tokens, access tokens, or full Plaid responses.
- Apply `db-schemas/plaid_items.sql` after `db-schemas/users.sql` to create the Plaid item and transaction tables and to add the sync and re-auth state columns. Existing databases can apply the same script to add the new columns and table. `PLAID_ACCESS_TOKEN_ENCRYPTION_KEY` is required to exchange and sync tokens; generate it with `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` and store the output in `.env`. Keep this key secret and stable: changing it makes previously stored access tokens unreadable. Access tokens are encrypted before storage and are not returned to clients.
- Passwords in `users.password_hash` must use the Argon2 format supported by `pwdlib`.
- Set `JWT_SECRET_KEY` to a long, random secret in `.env`; never use an example placeholder in a deployed environment.
- Run `sql/users.sql` against PostgreSQL before using the login route.

To run the Plaid route tests from `backend-api`, use `python -m pytest tests/unit/plaid`.

## Notes

- The API exposes a health-check endpoint at `/` and authentication endpoints at `/auth/signup` and `/auth/login`.
- The app is configured to run with FastAPI and reload during development.
