from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
  model_config = SettingsConfigDict(env_file=".env", extra="ignore")

  database_url: str
  jwt_secret_key: str = Field(min_length=32)
  jwt_algorithm: str = "HS256"
  access_token_expire_minutes: int = 10080
  cors_origins: str = "*"
  plaid_client_id: str | None = None
  plaid_secret: str | None = None
  plaid_access_token_encryption_key: str | None = None
  plaid_env: Literal["sandbox"] = "sandbox"
  plaid_webhook_url: str | None = None
  agent_service_url: str = "http://127.0.0.1:8001"
  gemini_api_key: str | None = None


settings = Settings()
