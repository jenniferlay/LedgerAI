import os
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import plaid
from cryptography.fernet import Fernet

os.environ["DATABASE_URL"] = "postgresql+asyncpg://test:test@localhost/test"
os.environ["JWT_SECRET_KEY"] = "1234567890abcdef1234567890abcdef"

import pytest
from fastapi.testclient import TestClient
from plaid.model.country_code import CountryCode
from plaid.model.products import Products
from sqlalchemy.dialects import postgresql

from app.auth.dependencies import get_current_user
from app.core.config import settings
from app.db.database import get_db
from app.plaid import service
from app.plaid.client import PlaidConfigurationError
from app.plaid.models import PlaidItem
from main import app


@pytest.fixture
def client() -> TestClient:
  app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(userid=123)
  with TestClient(app) as test_client:
    yield test_client
  app.dependency_overrides.pop(get_current_user, None)


def test_post_link_token_sends_authenticated_user_and_returns_token(
  client: TestClient,
  monkeypatch: pytest.MonkeyPatch,
) -> None:
  plaid_client = MagicMock()
  plaid_client.link_token_create.return_value = SimpleNamespace(link_token="link-sandbox-token")
  monkeypatch.setattr(service, "get_plaid_client", lambda: plaid_client)

  response = client.post("/plaid/link-token")

  assert response.status_code == 200
  assert response.json() == {"link_token": "link-sandbox-token"}
  request = plaid_client.link_token_create.call_args.args[0]
  assert request.user.client_user_id == "123"
  assert request.client_name == "LedgerAI"
  assert request.products == [Products("transactions")]
  assert request.country_codes == [CountryCode("US")]
  assert request.language == "en"


def test_post_link_token_requires_authentication() -> None:
  with TestClient(app) as client:
    response = client.post("/plaid/link-token")

  assert response.status_code == 401


def test_post_link_token_maps_missing_credentials_to_service_unavailable(
  client: TestClient,
  monkeypatch: pytest.MonkeyPatch,
) -> None:
  monkeypatch.setattr(
    service,
    "get_plaid_client",
    MagicMock(side_effect=PlaidConfigurationError()),
  )

  response = client.post("/plaid/link-token")

  assert response.status_code == 503
  assert response.json() == {"detail": "Plaid is not configured"}


def test_post_link_token_maps_plaid_api_error(
  client: TestClient,
  monkeypatch: pytest.MonkeyPatch,
) -> None:
  plaid_client = MagicMock()
  plaid_client.link_token_create.side_effect = plaid.ApiException()
  monkeypatch.setattr(service, "get_plaid_client", lambda: plaid_client)

  response = client.post("/plaid/link-token")

  assert response.status_code == 502
  assert response.json() == {"detail": "Unable to create Plaid Link token"}


def test_post_exchange_saves_encrypted_token_and_returns_only_item_id(
  client: TestClient,
  monkeypatch: pytest.MonkeyPatch,
) -> None:
  encryption_key = Fernet.generate_key().decode("ascii")
  monkeypatch.setattr(settings, "plaid_access_token_encryption_key", encryption_key)
  plaid_client = MagicMock()
  plaid_client.item_public_token_exchange.return_value = SimpleNamespace(
    access_token="access-sandbox-secret",
    item_id="item-123",
  )
  monkeypatch.setattr(service, "get_plaid_client", lambda: plaid_client)
  db = AsyncMock()
  monkeypatch.setitem(app.dependency_overrides, get_db, lambda: db)

  response = client.post(
    "/plaid/exchange",
    json={"public_token": "public-sandbox-token"},
  )

  assert response.status_code == 200
  assert response.json() == {"item_id": "item-123"}
  assert "access-sandbox-secret" not in response.text
  request = plaid_client.item_public_token_exchange.call_args.args[0]
  assert request.public_token == "public-sandbox-token"
  db.execute.assert_awaited_once()
  db.commit.assert_awaited_once()

  statement = db.execute.call_args.args[0]
  assert statement.table == PlaidItem.__table__
  assert statement._post_values_clause is not None
  compiled = statement.compile(dialect=postgresql.dialect())
  assert "ON CONFLICT (item_id) DO UPDATE" in compiled.string
  encrypted_tokens = [
    value
    for value in compiled.params.values()
    if isinstance(value, str) and value.startswith("gAAAA")
  ]
  assert encrypted_tokens
  assert all(
    Fernet(encryption_key).decrypt(value.encode("ascii")).decode("utf-8")
    == "access-sandbox-secret"
    for value in encrypted_tokens
  )


def test_post_exchange_requires_authentication() -> None:
  with TestClient(app) as client:
    response = client.post(
      "/plaid/exchange",
      json={"public_token": "public-sandbox-token"},
    )

  assert response.status_code == 401


def test_post_exchange_maps_invalid_public_token_to_bad_request(
  client: TestClient,
  monkeypatch: pytest.MonkeyPatch,
) -> None:
  monkeypatch.setattr(
    settings,
    "plaid_access_token_encryption_key",
    Fernet.generate_key().decode("ascii"),
  )
  plaid_client = MagicMock()
  api_error = plaid.ApiException()
  api_error.body = '{"error_code":"INVALID_PUBLIC_TOKEN"}'
  plaid_client.item_public_token_exchange.side_effect = api_error
  monkeypatch.setattr(service, "get_plaid_client", lambda: plaid_client)

  response = client.post(
    "/plaid/exchange",
    json={"public_token": "expired-public-token"},
  )

  assert response.status_code == 400
  assert response.json() == {
    "detail": "The Plaid public token is invalid or expired"
  }


def test_post_exchange_requires_encryption_key_before_calling_plaid(
  client: TestClient,
  monkeypatch: pytest.MonkeyPatch,
) -> None:
  monkeypatch.setattr(settings, "plaid_access_token_encryption_key", None)
  plaid_client = MagicMock()
  monkeypatch.setattr(service, "get_plaid_client", lambda: plaid_client)

  response = client.post(
    "/plaid/exchange",
    json={"public_token": "public-sandbox-token"},
  )

  assert response.status_code == 503
  assert response.json() == {
    "detail": "Plaid access-token encryption is not configured"
  }
  plaid_client.item_public_token_exchange.assert_not_called()
