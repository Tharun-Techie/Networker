"""Async Neo4j driver wrapper with graceful degradation.

If Neo4j is unreachable the driver stays None and graph endpoints return 503
with a clear message instead of crashing at import/startup time.
"""

from contextlib import asynccontextmanager
from typing import Any, Optional

from app.config import settings

_driver = None
_error: Optional[str] = None


async def get_driver():
    global _driver, _error
    if _driver is not None:
        return _driver
    try:
        from neo4j import AsyncGraphDatabase

        _driver = AsyncGraphDatabase.driver(
            settings.neo4j_uri, auth=(settings.neo4j_user, settings.neo4j_password)
        )
        await _driver.verify_connectivity()
        _error = None
        return _driver
    except Exception as exc:  # pragma: no cover - depends on live infra
        _driver = None
        _error = str(exc)
        return None


def driver_error() -> Optional[str]:
    return _error


async def close_driver() -> None:
    global _driver
    if _driver is not None:
        await _driver.close()
        _driver = None


@asynccontextmanager
async def get_session():
    driver = await get_driver()
    if driver is None:
        raise RuntimeError(f"Neo4j unavailable: {driver_error()}")
    async with driver.session() as session:
        yield session


async def run_read(query: str, params: dict[str, Any] | None = None) -> list[dict]:
    async with get_session() as session:
        result = await session.run(query, params or {})
        return [record.data() async for record in result]


async def run_write(query: str, params: dict[str, Any] | None = None) -> list[dict]:
    async with get_session() as session:
        result = await session.execute_write(
            lambda tx: tx.run(query, params or {})
        )
        return [record.data() async for record in result]
