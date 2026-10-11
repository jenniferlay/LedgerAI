import hashlib
import hmac
import time
from typing import Annotated, Any

from cryptography.fernet import Fernet
from cryptography.fernet import InvalidToken
import jwt
import plaid
from fastapi import Header, Request
from plaid.model.webhook_verification_key_get_request import (
  WebhookVerificationKeyGetRequest,
)
from starlette.concurrency import run_in_threadpool

from app.plaid.client import get_plaid_client

from app.core.config import settings


class PlaidEncryptionConfigurationError(RuntimeError):
  pass


class PlaidAccessTokenDecryptionError(RuntimeError):
  pass


class PlaidWebhookVerificationError(RuntimeError):
  pass


class PlaidWebhookVerificationApiError(RuntimeError):
  pass


def get_access_token_cipher() -> Fernet:
  key = settings.plaid_access_token_encryption_key
  if not key:
    raise PlaidEncryptionConfigurationError(
      "Plaid access-token encryption key is not configured"
    )

  try:
    return Fernet(key.encode("ascii"))
  except (UnicodeEncodeError, ValueError) as exc:
    raise PlaidEncryptionConfigurationError(
      "Plaid access-token encryption key is invalid"
    ) from exc


def encrypt_access_token(access_token: str, cipher: Fernet) -> str:
  return cipher.encrypt(access_token.encode("utf-8")).decode("ascii")


def decrypt_access_token(encrypted_access_token: str, cipher: Fernet) -> str:
  try:
    return cipher.decrypt(encrypted_access_token.encode("ascii")).decode("utf-8")
  except (InvalidToken, UnicodeEncodeError, ValueError) as exc:
    raise PlaidAccessTokenDecryptionError(
      "Stored Plaid access token could not be decrypted"
    ) from exc


async def verify_plaid_webhook(
  request: Request,
  plaid_verification: Annotated[str | None, Header(alias="Plaid-Verification")] = None,
) -> None:
  if not plaid_verification:
    raise PlaidWebhookVerificationError("Plaid verification header is missing")

  try:
    header = jwt.get_unverified_header(plaid_verification)
  except jwt.InvalidTokenError as exc:
    raise PlaidWebhookVerificationError("Plaid verification header is invalid") from exc

  key_id = header.get("kid")
  if header.get("alg") != "ES256" or not isinstance(key_id, str) or not key_id:
    raise PlaidWebhookVerificationError("Plaid verification header is invalid")

  try:
    client = get_plaid_client()
    response = await run_in_threadpool(
      client.webhook_verification_key_get,
      WebhookVerificationKeyGetRequest(key_id=key_id),
    )
  except plaid.ApiException as exc:
    raise PlaidWebhookVerificationApiError(
      "Unable to retrieve Plaid webhook verification key"
    ) from exc

  key = response.key
  if (
    key.kid != key_id
    or key.alg != "ES256"
    or key.kty != "EC"
    or key.crv != "P-256"
    or key.use != "sig"
    or (key.expired_at is not None and key.expired_at <= int(time.time()))
  ):
    raise PlaidWebhookVerificationError("Plaid webhook verification key is invalid")

  try:
    signing_key = jwt.PyJWK.from_dict(
      {
        "alg": key.alg,
        "crv": key.crv,
        "kid": key.kid,
        "kty": key.kty,
        "use": key.use,
        "x": key.x,
        "y": key.y,
      },
      algorithm="ES256",
    )
    claims: dict[str, Any] = jwt.decode(
      plaid_verification,
      signing_key.key,
      algorithms=["ES256"],
      options={"require": ["iat", "request_body_sha256"]},
    )
  except (jwt.InvalidTokenError, ValueError, TypeError) as exc:
    raise PlaidWebhookVerificationError("Plaid webhook signature is invalid") from exc

  issued_at = claims["iat"]
  if abs(int(time.time()) - issued_at) > 300:
    raise PlaidWebhookVerificationError("Plaid webhook signature has expired")

  body_hash = claims["request_body_sha256"]
  if not isinstance(body_hash, str):
    raise PlaidWebhookVerificationError("Plaid webhook body hash is invalid")
  expected_body_hash = hashlib.sha256(await request.body()).hexdigest()
  if not hmac.compare_digest(body_hash, expected_body_hash):
    raise PlaidWebhookVerificationError("Plaid webhook body hash does not match")
