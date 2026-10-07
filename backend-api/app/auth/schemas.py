from pydantic import BaseModel, EmailStr, Field, field_validator

class SignupRequest(BaseModel):
	email: EmailStr
	username: str = Field(min_length=1, max_length=255)
	password: str = Field(min_length=8, max_length=1024)

	@field_validator("email")
	@classmethod
	def normalize_email(cls, value: str) -> str:
		return value.lower()

	@field_validator("username")
	@classmethod
	def normalize_username(cls, value: str) -> str:
		return value.strip()

	@field_validator("password")
	@classmethod
	def validate_password(cls, value: str) -> str:
		if len(value) < 8:
			raise ValueError("Password must be at least 8 characters long")
		if not any(ch.isupper() for ch in value):
			raise ValueError("Password must contain at least one uppercase letter")
		if not any(ch.islower() for ch in value):
			raise ValueError("Password must contain at least one lowercase letter")
		if not any(ch.isdigit() for ch in value):
			raise ValueError("Password must contain at least one number")
		return value


class LoginRequest(BaseModel):
	email: EmailStr
	password: str = Field(min_length=1, max_length=1024)

	@field_validator("email")
	@classmethod
	def normalize_email(cls, value: str) -> str:
		return value.lower()


class SignupResponse(BaseModel):
	success: bool = True
	message: str = "User created successfully"


class LoginResponse(BaseModel):
	access_token: str
	token_type: str = "bearer"
	expires_in: int  # seconds