from functools import lru_cache

import plaid
from plaid.api import plaid_api

from app.core.config import settings


class PlaidConfigurationError(RuntimeError):
  pass


@lru_cache(maxsize=1)
def get_plaid_client() -> plaid_api.PlaidApi:
  if not settings.plaid_client_id or not settings.plaid_secret:
    raise PlaidConfigurationError("Plaid credentials are not configured")

  configuration = plaid.Configuration(
    host=plaid.Environment.Sandbox,
    api_key={
      "clientId": settings.plaid_client_id,
      "secret": settings.plaid_secret,
    },
  )
  return plaid_api.PlaidApi(plaid.ApiClient(configuration))
