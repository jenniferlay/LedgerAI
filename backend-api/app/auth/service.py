from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.exceptions import InvalidCredentialsError
from app.auth.models import User
from app.auth.security import DUMMY_HASH, verify_password


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User:
    user = await db.scalar(select(User).where(User.email == email))

    stored_hash = user.password_hash if user else DUMMY_HASH
    is_valid, new_hash = verify_password(password, stored_hash)

    if user is None or not is_valid:
        raise InvalidCredentialsError()

    if new_hash:  # hashing params changed since this hash was created
        user.password_hash = new_hash
        await db.commit()

    return user