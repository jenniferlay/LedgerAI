from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.plaid.client import PlaidConfigurationError
from app.plaid.security import (
  PlaidAccessTokenDecryptionError,
  PlaidEncryptionConfigurationError,
  PlaidWebhookVerificationApiError,
  PlaidWebhookVerificationError,
)
from app.plaid.service import (
  PlaidApiError,
  PlaidInvalidPublicTokenError,
  PlaidItemNotFoundError,
)

PLAID_ERROR_RESPONSES: dict[type[Exception], tuple[int, str]] = {
  PlaidConfigurationError: (503, "Plaid is not configured"),
  PlaidApiError: (502, "Unable to complete Plaid request"),
  PlaidInvalidPublicTokenError: (
    400,
    "The Plaid public token is invalid or expired",
  ),
  PlaidItemNotFoundError: (404, "Plaid item not found"),
  PlaidAccessTokenDecryptionError: (
    503,
    "Stored Plaid access token could not be decrypted",
  ),
  PlaidEncryptionConfigurationError: (
    503,
    "Plaid access-token encryption is not configured",
  ),
  PlaidWebhookVerificationError: (401, "Invalid Plaid webhook signature"),
  PlaidWebhookVerificationApiError: (
    502,
    "Unable to verify Plaid webhook signature",
  ),
}


async def _plaid_exception_handler(
  request: Request,
  exc: Exception,
) -> JSONResponse:
  status_code, detail = next(
    PLAID_ERROR_RESPONSES[exception_type]
    for exception_type in type(exc).__mro__
    if exception_type in PLAID_ERROR_RESPONSES
  )
  return JSONResponse(status_code=status_code, content={"detail": detail})


def register_plaid_error_handlers(app: FastAPI) -> None:
  for exception_type in PLAID_ERROR_RESPONSES:
    app.add_exception_handler(exception_type, _plaid_exception_handler)
