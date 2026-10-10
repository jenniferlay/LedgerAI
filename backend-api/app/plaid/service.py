import json

import plaid
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.plaid.client import get_plaid_client
from app.plaid.models import PlaidItem
from app.plaid.security import encrypt_access_token, get_access_token_cipher


class PlaidApiError(RuntimeError):
  pass


class PlaidInvalidPublicTokenError(PlaidApiError):
  pass


async def create_link_token(user_id: int) -> str:
  client = get_plaid_client()
  request = LinkTokenCreateRequest(
    user=LinkTokenCreateRequestUser(client_user_id=str(user_id)),
    client_name="LedgerAI",
    products=[Products("transactions")],
    country_codes=[CountryCode("US")],
    language="en",
  )

  try:
    response = await run_in_threadpool(client.link_token_create, request)
  except plaid.ApiException as exc:
    raise PlaidApiError("Unable to create Plaid Link token") from exc

  return response.link_token


async def exchange_public_token(
  db: AsyncSession,
  user_id: int,
  public_token: str,
) -> str:
  cipher = get_access_token_cipher()
  client = get_plaid_client()
  request = ItemPublicTokenExchangeRequest(public_token=public_token)

  try:
    response = await run_in_threadpool(client.item_public_token_exchange, request)
  except plaid.ApiException as exc:
    if _get_error_code(exc) == "INVALID_PUBLIC_TOKEN":
      raise PlaidInvalidPublicTokenError from exc
    raise PlaidApiError("Unable to exchange Plaid public token") from exc

  encrypted_access_token = encrypt_access_token(response.access_token, cipher)
  statement = insert(PlaidItem).values(
    user_id=user_id,
    item_id=response.item_id,
    access_token=encrypted_access_token,
  )
  statement = statement.on_conflict_do_update(
    index_elements=[PlaidItem.item_id],
    set_={
      "user_id": user_id,
      "access_token": encrypted_access_token,
    },
  )
  await db.execute(statement)
  await db.commit()

  return response.item_id


def _get_error_code(exc: plaid.ApiException) -> str | None:
  try:
    error_response = json.loads(exc.body or "{}")
  except (AttributeError, TypeError, ValueError):
    return None
  if not isinstance(error_response, dict):
    return None
  error_code = error_response.get("error_code")
  return error_code if isinstance(error_code, str) else None
