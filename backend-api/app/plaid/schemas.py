from pydantic import BaseModel, Field


class LinkTokenResponse(BaseModel):
  link_token: str


class PublicTokenExchangeRequest(BaseModel):
  public_token: str = Field(min_length=1)


class PublicTokenExchangeResponse(BaseModel):
  item_id: str
