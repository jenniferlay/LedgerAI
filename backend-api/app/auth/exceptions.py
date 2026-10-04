from fastapi import HTTPException, status

_BEARER = {"WWW-Authenticate": "Bearer"}

class InvalidCredentialsError(HTTPException):
  def __init__(self) -> None:
    super().__init__(
      status_code=status.HTTP_401_UNAUTHORIZED,
      detail="Invalid email or password",
      headers=_BEARER,
    )


class InvalidTokenError(HTTPException):
  def __init__(self) -> None:
    super().__init__(
      status_code=status.HTTP_401_UNAUTHORIZED,
      detail="Invalid or expired token",
      headers=_BEARER,
    )