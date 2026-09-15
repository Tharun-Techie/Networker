"""Graph query service: the ONLY place raw Cypher lives.

Frontend never sends Cypher; routers call these helpers. Each helper takes an
explicit `run` callable so unit tests can inject a fake without a live Neo4j.
"""

from datetime import datetime, timezone
from typing import Any, Awaitable, Callable

from app.schemas import ALLOWED_RELS, Confidence, EdgeCreate, NodeCreate

RunFn = Callable[[str, dict | None], Awaitable[list[dict]]]


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


def _validate_rel(rel_type: str) -> str:
    if rel_type not in ALLOWED_RELS:
        raise ValueError(f"Unknown relationship type: {rel_type}")
    return rel_type


async def create_node(data: NodeCreate, run: RunFn) -> dict:
    now = _utcnow()
    query = (
        "CREATE (n:`%s` {id: $id, name: $name, aliases: $aliases, "
        "aliases_text: $aliases_text, attributes: $attributes, "
        "created_at: $now, updated_at: $now}) RETURN n" % data.type.value
    )
    rows = await run(
        query,
        {
            "id": data.id,
            "name": data.name,
            "aliases": data.aliases,
            "aliases_text": " ".join([data.name, *data.aliases]),
            "attributes": data.attributes,
            "now": now,
        },
    )
    return rows[0]["n"] if rows else {"id": data.id}


async def create_edge(data: EdgeCreate, run: RunFn) -> dict:
    """All edges require source + confidence. AI writes inferred; promotion to
    verified happens only via update_edge_confidence with a human actor."""
    _validate_rel(data.rel_type.value)
    now = _utcnow()
    query = """
    MATCH (a {id: $from_id}), (b {id: $to_id})
    CREATE (a)-[r:`%s` {
      id: randomUUID(),
      start_date: $start_date, end_date: $end_date,
      source: $source, confidence: $confidence, note: $note,
      created_by: $created_by, created_at: $created_at
    }]->(b)
    RETURN r
    """ % data.rel_type.value
    rows = await run(
        query,
        {
            "from_id": data.from_id,
            "to_id": data.to_id,
            "start_date": data.start_date.isoformat() if data.start_date else None,
            "end_date": data.end_date.isoformat() if data.end_date else None,
            "source": data.source,
            "confidence": data.confidence.value,
            "note": data.note,
            "created_by": data.created_by,
            "created_at": now,
        },
    )
    return rows[0]["r"] if rows else {}


def build_expand_query(depth: int, rel_types: list[str] | None, since: str | None, until: str | None) -> str:
    depth = max(1, min(depth, 4))
    rel = ":" + "|".join("`%s`" % _validate_rel(r) for r in rel_types) if rel_types else ""
    # Time-bounds filter on edge start/end dates (nullable = ongoing/unknown)
    time_filter = ""
    if since:
        time_filter += " AND (r.start_date IS NULL OR r.start_date >= $since)"
    if until:
        time_filter += " AND (r.end_date IS NULL OR r.end_date <= $until)"
    return (
        "MATCH (src {id: $node_id})-[r%s*1..%d]-(n) "
        "WHERE true %s RETURN src, r, n LIMIT 500" % (rel, depth, time_filter)
    )


async def expand(node_id: str, depth: int = 1, rel_types: list[str] | None = None,
                 since: str | None = None, until: str | None = None, run: RunFn = None) -> dict:
    params: dict[str, Any] = {"node_id": node_id}
    if since:
        params["since"] = since
    if until:
        params["until"] = until
    query = build_expand_query(depth, rel_types, since, until)
    rows = await run(query, params)
    return _rows_to_graph(rows)


async def shortest_path(from_id: str, to_id: str, run: RunFn) -> dict:
    query = """
    MATCH p = shortestPath((a {id: $from_id})-[*..6]-(b {id: $to_id}))
    RETURN [n IN nodes(p) | n] AS nodes, [r IN relationships(p) | r] AS edges
    """
    rows = await run(query, {"from_id": from_id, "to_id": to_id})
    if not rows:
        return {"nodes": [], "edges": []}
    row = rows[0]
    return {"nodes": row.get("nodes", []), "edges": row.get("edges", [])}


async def common_connections(a: str, b: str, run: RunFn) -> dict:
    query = """
    MATCH (x {id: $a})--(c)--(y {id: $b})
    WHERE x <> y
    RETURN c AS node LIMIT 100
    """
    rows = await run(query, {"a": a, "b": b})
    return {"nodes": [r["node"] for r in rows], "edges": []}


async def update_edge_confidence(edge_id: str, confidence: Confidence, actor: str, run: RunFn) -> dict:
    if confidence == Confidence.VERIFIED and not actor:
        raise ValueError("Promoting to verified requires a human actor")
    query = """
    MATCH ()-[r {id: $edge_id}]->()
    SET r.confidence = $confidence, r.last_verified_by = $actor
    RETURN r
    """
    rows = await run(query, {"edge_id": edge_id, "confidence": confidence.value, "actor": actor})
    return rows[0]["r"] if rows else {}


def _rows_to_graph(rows: list[dict]) -> dict:
    nodes: dict[str, dict] = {}
    edges: dict[str, dict] = {}
    for row in rows:
        for key in ("src", "n"):
            n = row.get(key)
            if isinstance(n, dict) and n.get("id"):
                nodes[n["id"]] = n
        r = row.get("r")
        rels = r if isinstance(r, list) else ([r] if r else [])
        for rel in rels:
            if isinstance(rel, dict) and rel.get("id", rel.get("source")):
                edges[rel.get("id", str(len(edges)))] = rel
    return {"nodes": list(nodes.values()), "edges": list(edges.values())}
