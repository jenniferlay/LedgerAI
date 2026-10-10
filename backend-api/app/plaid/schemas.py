from pydantic import BaseModel


class LinkTokenResponse(BaseModel):
  link_token: str
