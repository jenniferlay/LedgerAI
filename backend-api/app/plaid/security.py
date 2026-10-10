from cryptography.fernet import Fernet

from app.core.config import settings


class PlaidEncryptionConfigurationError(RuntimeError):
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
