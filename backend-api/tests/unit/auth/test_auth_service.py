import os
from unittest.mock import AsyncMock, MagicMock

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://test:test@localhost/test",
)
os.environ.setdefault("JWT_SECRET_KEY", "1234567890abcdef1234567890abcdef")

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.exceptions import EmailAlreadyExistsError
from app.auth.service import create_user


@pytest.fixture
def db() -> MagicMock:
    session = MagicMock(spec=AsyncSession)
    session.scalar = AsyncMock(return_value=None)
    session.commit = AsyncMock(
        side_effect=IntegrityError(
            "INSERT INTO users",
            {},
            Exception("duplicate key value violates unique constraint"),
        )
    )
    session.rollback = AsyncMock()
    session.refresh = AsyncMock()
    return session


@pytest.mark.asyncio
async def test_create_user_raises_email_already_exists_when_unique_constraint_fails(db: MagicMock) -> None:
    with pytest.raises(EmailAlreadyExistsError):
        await create_user(db, " Alice@Example.com ", "Alice", "password123")

    db.add.assert_called_once()
    db.rollback.assert_awaited_once_with()
