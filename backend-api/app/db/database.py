from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.core.config import settings

engine = create_async_engine(
    settings.database_url,
    pool_pre_ping=True,  # detect connections the server has dropped
    pool_recycle=1800,  # refresh connections every 30 min
)

SessionLocal = async_sessionmaker(
    engine,
    autoflush=False,
    expire_on_commit=False,
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
	async with SessionLocal() as db:
		yield db