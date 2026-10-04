from pydantic import BaseModel, EmailStr, Field, field_validator

class LoginRequest(BaseModel):
	email: EmailStr
	password: str = Field(min_length=1, max_length=1024)

	@field_validator("email")
	@classmethod
	def normalize_email(cls, value: str) -> str:
		return value.lower()


class LoginResponse(BaseModel):
	access_token: str
	token_type: str = "bearer"
	expires_in: int  # seconds