# LedgerAI Backend API

This is the backend service for the LedgerAI application. It provides the REST API built with FastAPI, SQLAlchemy 2.0 (async), and PostgreSQL.

## Quick start

From the `backend-api` directory:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
# Set DATABASE_URL and JWT_SECRET_KEY in .env
python main.py
```

Run the command from the `backend-api` directory. The app reads configuration from `.env`. The development entry point binds to `0.0.0.0` on port `8000`, allowing mobile devices on the same reachable network to connect during development.

Once started, explore the interactive documentation:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **Health check:** http://localhost:8000/

## Testing

From the `backend-api` directory, install the development dependencies and run tests:

```powershell
pip install -r requirements-dev.txt
python -m pytest
```

To run a specific test suite:

```powershell
python -m pytest tests/unit/auth
python -m pytest tests/unit/expenses
python -m pytest tests/unit/plaid
```

## Project structure

```text
backend-api/
├── app/
│   ├── auth/         # User authentication, registration, JWT & Argon2 security
│   ├── budgets/      # Category budget limits, tracking & monthly summaries
│   ├── category/     # Hierarchical categories & Material icon validation
│   ├── core/         # Settings & environment configuration
│   ├── db/           # Async SQLAlchemy database engine & base model
│   ├── expenses/     # Expense CRUD & combined manual/Plaid transaction feed
│   └── plaid/        # Plaid Link, token exchange, transaction sync & webhooks
├── db-schemas/       # PostgreSQL DDL scripts (setup.sql, users.sql, etc.)
├── tests/
│   └── unit/         # Unit test suites (auth, expenses, plaid)
├── .env.example      # Example environment configuration
├── main.py           # Application entry point & router registration
├── pytest.ini        # Pytest configuration
├── requirements.txt  # Production dependencies
└── requirements-dev.txt # Development and test dependencies
```

## Database setup

Database schema scripts are located in `db-schemas/`. The API does not create or alter tables automatically at startup.

- To initialize a fresh database with all tables, constraints, and default categories, execute `db-schemas/setup.sql`:
  ```powershell
  psql -d <your_database> -f db-schemas/setup.sql
  ```
  *(Note: `setup.sql` recreates all tables and resets data).*
- Individual component schemas:
  - `db-schemas/users.sql`: User accounts and credentials.
  - `db-schemas/categories.sql`: Category hierarchy with system-level and user-level ownership.
  - `db-schemas/expense.sql`: Manual expense records with category foreign keys.
  - `db-schemas/plaid.sql`: Plaid linked items and synced transactions.
  - `db-schemas/budgets.sql`: Monthly category budget thresholds.

### Connections and ORM
- `app.db.database` configures an asynchronous SQLAlchemy engine and session factory (`SessionLocal`) using `asyncpg`.
- PostgreSQL URLs are automatically adapted for `asyncpg` with SSL negotiation.
- Inject database sessions into FastAPI routes using `from app.db.database import get_db` and `db: AsyncSession = Depends(get_db)`.
- Passwords stored in `users.password_hash` use the Argon2 format managed by `pwdlib`.

## API modules & endpoints

### Authentication (`/auth`)
- `POST /auth/signup` - Register a new account (`username`, `email`, `password`). Requires minimum 8 characters with lowercase, uppercase, and numbers.
- `POST /auth/login` - Authenticate with email and password; returns an HS256 JWT bearer token valid for 7 days.

### Expenses (`/expenses`)
- `POST /expenses` - Create a manual expense (`amount_dollars`, `amount_cents`, `note`, `spent_on`, `merchant`, `categoryid`).
- `GET /expenses` - Combined feed of manual expenses and Plaid-synced transactions. Supports filtering by `start_date`, `end_date`, `categoryid`, `merchant`, `limit` (max 500), and `offset`.
- `PUT /expenses/{source}/{item_id}` - Update a manual or Plaid transaction (note, amount, merchant, spent_on, categoryid).
- `DELETE /expenses/{source}/{item_id}` - Delete a manual expense or Plaid transaction item.

### Categories (`/categories`)
- `GET /categories` - List all system global categories and user-created custom categories with hierarchical parent relationships.
- `POST /categories` - Create a custom category (`name`, optional `parent_categoryid`, optional Material icon). Subcategories can only be nested one level deep.

### Budgets (`/budgets`)
- `GET /budgets` - Get monthly budget summaries, total budget, spent amount, remaining balance, and breakdown per category group. Accepts optional `month=YYYY-MM-DD`.
- `POST /budgets` - Create or assign a monthly budget limit to a category.
- `GET /budgets/{budgetid}` - Fetch details and progress for a single budget.
- `PUT /budgets/{budgetid}` - Update budget limit amount.
- `DELETE /budgets/{budgetid}` - Remove a budget allocation.

### Plaid integration (`/plaid`)
- `POST /plaid/link-token` - Generate a Plaid Link token for bank connection.
- `POST /plaid/exchange` - Exchange `public_token` from Plaid Link for an encrypted access token and kick off initial transaction sync.
- `POST /plaid/items/{item_id}/sync` - Manually sync latest transactions for a linked institution.
- `POST /plaid/items/{item_id}/update-link-token` - Generate an update-mode Link token when re-authentication is required.
- `POST /plaid/webhooks` - Webhook receiver for Plaid `TRANSACTIONS` updates with JWT signature verification.
- Plaid access tokens are encrypted at rest using Fernet encryption (`PLAID_ACCESS_TOKEN_ENCRYPTION_KEY`). Generate one with:
  ```powershell
  python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
  ```

