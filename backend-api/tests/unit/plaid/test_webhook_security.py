import hashlib
import json
import time
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import jwt
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi.testclient import TestClient
import pytest

from app.db.database import get_db
from app.plaid import security
from app.plaid.router import webhooks
from app.plaid.schemas import SyncSummary
from main import app


def test_plaid_webhook_rejects_missing_signature() -> None:
  with TestClient(app) as client:
    response = client.post(
      "/plaid/webhooks",
      json={
        "webhook_type": "TRANSACTIONS",
        "webhook_code": "SYNC_UPDATES_AVAILABLE",
        "item_id": "item-123",
      },
    )

  assert response.status_code == 401


def test_plaid_webhook_verifies_signature_and_body_hash(
  monkeypatch: pytest.MonkeyPatch,
) -> None:
  private_key = ec.generate_private_key(ec.SECP256R1())
  key_id = "webhook-key-1"
  key_data = json.loads(jwt.algorithms.ECAlgorithm.to_jwk(private_key.public_key()))
  key_data.update({"kid": key_id, "alg": "ES256", "use": "sig"})
  plaid_client = MagicMock()
  plaid_client.webhook_verification_key_get.return_value = SimpleNamespace(
    key=SimpleNamespace(**key_data, expired_at=None)
  )
  monkeypatch.setattr(security, "get_plaid_client", lambda: plaid_client)

  webhook_body = {
    "webhook_type": "TRANSACTIONS",
    "webhook_code": "SYNC_UPDATES_AVAILABLE",
    "item_id": "item-123",
  }
  raw_body = json.dumps(webhook_body, separators=(",", ":")).encode("utf-8")
  token = jwt.encode(
    {
      "iat": int(time.time()),
      "request_body_sha256": hashlib.sha256(raw_body).hexdigest(),
    },
    private_key,
    algorithm="ES256",
    headers={"kid": key_id},
  )
  db = AsyncMock()
  monkeypatch.setitem(app.dependency_overrides, get_db, lambda: db)
  sync = AsyncMock(return_value=SyncSummary(status="success"))
  monkeypatch.setattr(webhooks, "sync_plaid_item", sync)

  with TestClient(app) as client:
    rejected = client.post(
      "/plaid/webhooks",
      content=raw_body + b" ",
      headers={"Content-Type": "application/json", "Plaid-Verification": token},
    )
    response = client.post(
      "/plaid/webhooks",
      content=raw_body,
      headers={"Content-Type": "application/json", "Plaid-Verification": token},
    )

  assert rejected.status_code == 401
  assert response.status_code == 200
  assert response.json()["status"] == "success"
  assert plaid_client.webhook_verification_key_get.call_count == 2
  sync.assert_awaited_once_with(db, "item-123")
