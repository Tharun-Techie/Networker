"""Purpose-built graph endpoints wrapping Cypher (no raw Cypher from clients)."""

from fastapi import APIRouter, HTTPException, Query

from app import db_neo4j
from app.services import graph_service

router = APIRouter(prefix="/graph", tags=["graph"])


def _unavailable(exc: RuntimeError) -> HTTPException:
    return HTTPException(status_code=503, detail=str(exc))


@router.get("/node/{node_id}/expand")
async def expand(
    node_id: str,
    depth: int = Query(1, ge=1, le=4),
    rel: list[str] | None = Query(None),
    since: str | None = None,
    until: str | None = None,
):
    try:
        return await graph_service.expand(node_id, depth, rel, since, until, run=db_neo4j.run_read)
    except RuntimeError as exc:
        raise _unavailable(exc)
    except ValueError as exc:
        raise HTTPException(400, str(exc))


@router.get("/path")
async def path(from_id: str = Query(alias="from"), to_id: str = ""):
    try:
        return await graph_service.shortest_path(from_id, to_id, run=db_neo4j.run_read)
    except RuntimeError as exc:
        raise _unavailable(exc)


@router.get("/common")
async def common(a: str, b: str):
    try:
        return await graph_service.common_connections(a, b, run=db_neo4j.run_read)
    except RuntimeError as exc:
        raise _unavailable(exc)
