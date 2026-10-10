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
- `POST /auth/login` accepts JSON with an `email` and `password`, checks the user against the existing `users` table, and returns a 30-minute HS256 bearer token.
- For development, CORS allows all origins by default so Expo Go on a phone can reach the API. Set `CORS_ORIGINS` to a comma-separated list of trusted origins to restrict browser access when deploying. Credentials remain disabled.
- `POST /expenses` accepts JSON expense details and requires a bearer token. The expense owner is taken from the verified token; clients must not provide a user ID. If `categoryid` is omitted, it defaults to `1` (the system-wide General category). The API only accepts global or caller-owned categories, and the composite foreign key enforces the same ownership rule for direct SQL writes.
- `GET /expenses` requires a bearer token and returns only the caller's expenses, newest first. Optional `start_date` and `end_date` filters are inclusive; `categoryid` filters by category; `merchant` performs a case-insensitive substring search. Results are paginated with `limit` (default `100`, maximum `500`) and `offset` (default `0`).
- Passwords in `users.password_hash` must use the Argon2 format supported by `pwdlib`.
- Set `JWT_SECRET_KEY` to a long, random secret in `.env`; never use an example placeholder in a deployed environment.
- Run `sql/users.sql` against PostgreSQL before using the login route.

## Notes

- The API exposes a health-check endpoint at `/` and authentication endpoints at `/auth/signup` and `/auth/login`.
- The app is configured to run with FastAPI and reload during development.
