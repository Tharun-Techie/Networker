"""Async SQLAlchemy engine/session. Tables are created via init.sql in prod;
`create_all` is only a dev convenience."""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.models_sql import Base

engine = create_async_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_session():
    async with SessionLocal() as session:
        yield session


async def init_sql_models() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
