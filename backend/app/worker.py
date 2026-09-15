"""arq background worker: ingestion, entity resolution, enrichment.

Run with:  arq app.worker.WorkerSettings  (needs Redis + Neo4j)
Dequeue from anywhere:  await redis.enqueue_job("ingest_candidates", nodes=[...], edges=[...])

Jobs take the same injectable `run` seam as graph_service: in production the
ctx has no "run" key and the real Neo4j driver is used; tests inject a fake.
Nothing here merges or verifies autonomously — duplicate scan returns
candidates for human review, ingestion forces confidence=inferred.
"""

from arq import cron
from arq.connections import RedisSettings

from app.config import settings
from app.schemas import EdgeCreate, NodeCreate


def _run(ctx, kind: str):
    """Resolve the Neo4j run callable: test fake from ctx, else the real driver."""
    if ctx and ctx.get("run"):
        return ctx["run"]
    from app import db_neo4j

    return db_neo4j.run_read if kind == "read" else db_neo4j.run_write


async def ingest_candidates(ctx, *, nodes: list[dict], edges: list[dict]) -> dict:
    from app.services import ingestion

    parsed_nodes = [NodeCreate(**n) for n in nodes]
    parsed_edges = [EdgeCreate(**e) for e in edges]
    result = await ingestion.persist_candidates(parsed_nodes, parsed_edges, _run(ctx, "write"))
    return {"nodes": len(result["nodes"]), "edges": len(result["edges"])}


async def scan_duplicates(ctx, *, threshold: float = 0.85) -> dict:
    from app.services import entity_resolution as er

    rows = await _run(ctx, "read")(
        "MATCH (n) WHERE n:Person OR n:Organization OR n:Family OR n:Institution "
        "RETURN n.id AS id, n.name AS name, n.aliases AS aliases LIMIT 10000",
        None,
    )
    nodes = [
        {"id": r.get("id"), "name": r.get("name", ""), "aliases": r.get("aliases") or []}
        for r in rows
    ]
    pairs = await er.find_duplicate_candidates(nodes, threshold)
    # Candidates only — a human confirms the merge via a future merge endpoint.
    return {"candidates": [{"a": a, "b": b, "score": s} for a, b, s in pairs]}


async def enrich_node(ctx, *, node_id: str) -> dict:
    """Placeholder: external enrichment (filings, news) lands here later."""
    rows = await _run(ctx, "read")("MATCH (n {id: $id}) RETURN n LIMIT 1", {"id": node_id})
    if not rows:
        raise ValueError(f"Node not found: {node_id}")
    return {"node_id": node_id, "enriched": False, "reason": "no enrichment providers configured"}


class WorkerSettings:
    functions = [ingest_candidates, scan_duplicates, enrich_node]
    cron_jobs = [cron(scan_duplicates, hour=2, minute=0)]  # nightly duplicate scan
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
