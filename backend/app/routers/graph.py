"""Purpose-built graph endpoints wrapping Cypher (no raw Cypher from clients)."""

from fastapi import APIRouter, HTTPException, Query

from app import db_neo4j
from app.schemas import GraphResult
from app.services import graph_service
from app.services import insight as insight_svc

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


@router.get("/shared-employment")
async def shared_employment(a: str, b: str):
    """People who worked at / served BOTH organizations (ids)."""
    try:
        return await graph_service.shared_employment(a, b, run=db_neo4j.run_read)
    except RuntimeError as exc:
        raise _unavailable(exc)


@router.get("/connectors")
async def connectors(a: str, b: str):
    """People bridging Company A and Company B, with the connecting edges."""
    try:
        return await graph_service.connectors(a, b, run=db_neo4j.run_read)
    except RuntimeError as exc:
        raise _unavailable(exc)


@router.get("/board-overlap")
async def board_overlap(org: list[str] = Query(...)):
    """Board members serving across the given organization ids."""
    try:
        return await graph_service.board_overlap(org, run=db_neo4j.run_read)
    except RuntimeError as exc:
        raise _unavailable(exc)
    except ValueError as exc:
        raise HTTPException(400, str(exc))


@router.get("/node/{node_id}/timeline")
async def timeline(node_id: str):
    """Career/relationship timeline for a node, oldest first."""
    try:
        return await graph_service.timeline(node_id, run=db_neo4j.run_read)
    except RuntimeError as exc:
        raise _unavailable(exc)


@router.post("/insight", response_model=dict)
async def graph_insight(graph: GraphResult):
    """Fact-grounded network summary. Every claim cites edge ids; no LLM needed.

    FACT (from edges) and INFERENCE (patterns worth checking) are returned as
    separate lists so the UI can never present a guess as verified.
    """
    return insight_svc.summarize(graph)
