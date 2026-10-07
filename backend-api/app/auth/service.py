from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.exceptions import EmailAlreadyExistsError, InvalidCredentialsError
from app.auth.models import User
from app.auth.security import DUMMY_HASH, hash_password, verify_password


async def create_user(db: AsyncSession, email: str, username: str, password: str) -> User:
    normalized_email = email.lower().strip()

    user = User(
        email=normalized_email,
        username=username.strip(),
        password_hash=hash_password(password),
    )
    db.add(user)

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise EmailAlreadyExistsError() from exc

    await db.refresh(user)
    return user


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User:
    user = await db.scalar(select(User).where(User.email == email.lower()))

    stored_hash = user.password_hash if user else DUMMY_HASH
    is_valid, new_hash = verify_password(password, stored_hash)

    if user is None or not is_valid:
        raise InvalidCredentialsError()

    if new_hash:  # hashing params changed since this hash was created
        user.password_hash = new_hash
        await db.commit()

    return user