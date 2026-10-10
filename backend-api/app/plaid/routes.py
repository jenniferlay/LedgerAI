import plaid
from fastapi import APIRouter, HTTPException, status
from plaid.model.country_code import CountryCode
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from starlette.concurrency import run_in_threadpool

from app.auth.dependencies import CurrentUser
from app.plaid.client import PlaidConfigurationError, get_plaid_client
from app.plaid.schemas import LinkTokenResponse

router = APIRouter(prefix="/plaid", tags=["plaid"])


@router.post("/link-token", response_model=LinkTokenResponse)
async def post_link_token(current_user: CurrentUser) -> LinkTokenResponse:
  try:
    client = get_plaid_client()
  except PlaidConfigurationError as exc:
    raise HTTPException(
      status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
      detail="Plaid is not configured",
    ) from exc

  request = LinkTokenCreateRequest(
    user=LinkTokenCreateRequestUser(client_user_id=str(current_user.userid)),
    client_name="LedgerAI",
    products=[Products("transactions")],
    country_codes=[CountryCode("US")],
    language="en",
  )

  try:
    response = await run_in_threadpool(client.link_token_create, request)
  except plaid.ApiException as exc:
    raise HTTPException(
      status_code=status.HTTP_502_BAD_GATEWAY,
      detail="Unable to create Plaid Link token",
    ) from exc

  return LinkTokenResponse(link_token=response.link_token)
