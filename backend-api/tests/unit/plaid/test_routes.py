import os
from types import SimpleNamespace
from unittest.mock import MagicMock

import plaid

os.environ["DATABASE_URL"] = "postgresql+asyncpg://test:test@localhost/test"
os.environ["JWT_SECRET_KEY"] = "1234567890abcdef1234567890abcdef"

import pytest
from fastapi.testclient import TestClient
from plaid.model.country_code import CountryCode
from plaid.model.products import Products

from app.auth.dependencies import get_current_user
from app.plaid import routes
from app.plaid.client import PlaidConfigurationError
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
  monkeypatch.setattr(routes, "get_plaid_client", lambda: plaid_client)

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
    routes,
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
  monkeypatch.setattr(routes, "get_plaid_client", lambda: plaid_client)

  response = client.post("/plaid/link-token")

  assert response.status_code == 502
  assert response.json() == {"detail": "Unable to create Plaid Link token"}
