from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash

from app.core.config import settings

hasher = PasswordHash.recommended()

# Verified against when the email doesn't exist, so response time doesn't
# reveal which emails are registered.
DUMMY_HASH = hasher.hash("timing-attack-protection")


def hash_password(password: str) -> str:
	return hasher.hash(password)


def verify_password(password: str, hashed_password: str) -> tuple[bool, str | None]:
	"""Return (is_valid, new_hash_or_None). A new hash means the stored one should be upgraded."""
	return hasher.verify_and_update(password, hashed_password)


def create_access_token(user_id: int) -> str:
	now = datetime.now(timezone.utc)
	payload = {
		"sub": str(user_id),
		"iat": now,
		"exp": now + timedelta(minutes=settings.access_token_expire_minutes),
	}
	return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> int | None:
	"""Return the user id, or None if the token is invalid/expired."""
	try:
		payload = jwt.decode(
			token,
			settings.jwt_secret_key,
			algorithms=[settings.jwt_algorithm],
			options={"require": ["exp", "sub"]},
		)
		return int(payload["sub"])
	except (jwt.PyJWTError, ValueError):
		return None