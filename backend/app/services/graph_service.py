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


# Concept §12: the killer query engine. All helpers take an injectable `run`
# so unit tests cover the Cypher construction without a live Neo4j.

# Edges that count as "having worked at / served" an organization.
WORK_REL_TYPES = ("employee_of", "director_of", "board_member_of",
                  "chairman_of", "founder_of", "advisor_to")
BOARD_REL_TYPES = ("director_of", "board_member_of", "chairman_of", "trustee_of")


async def shared_employment(org_a_id: str, org_b_id: str, run: RunFn) -> dict:
    """People who have worked at / served BOTH organizations.

    Answers: "Which people have worked at both TCS and Infosys?"
    """
    query = """
    MATCH (p:Person)-[r1]->(a {id: $a}), (p)-[r2]->(b {id: $b})
    WHERE type(r1) IN $work_rels AND type(r2) IN $work_rels
    RETURN p AS person, r1, r2, a, b
    """
    rows = await run(query, {"a": org_a_id, "b": org_b_id,
                             "work_rels": list(WORK_REL_TYPES)})
    people: dict[str, dict] = {}
    edges: dict[str, dict] = {}
    orgs: dict[str, dict] = {}
    for row in rows:
        for key in ("person", "a", "b"):
            n = row.get(key)
            if isinstance(n, dict) and n.get("id"):
                (people if key == "person" else orgs)[n["id"]] = n
        for key in ("r1", "r2"):
            r = row.get(key)
            if isinstance(r, dict) and r.get("id", r.get("source")):
                edges[r.get("id", str(len(edges)))] = r
    return {"nodes": [*orgs.values(), *people.values()],
            "edges": list(edges.values())}


async def connectors(org_a_id: str, org_b_id: str, run: RunFn) -> dict:
    """People who connect Company A and Company B (1 hop to each side).

    Answers: "Show people who connect Company A and Company B."
    Unlike common_connections, this also returns the connecting edges so the
    UI can render the A — person — B bridge with evidence.
    """
    query = """
    MATCH (a {id: $a})-[r1]-(p:Person)-[r2]-(b {id: $b})
    WHERE a <> b
    RETURN a, r1, p, r2, b LIMIT 200
    """
    rows = await run(query, {"a": org_a_id, "b": org_b_id})
    nodes: dict[str, dict] = {}
    edges: dict[str, dict] = {}
    for row in rows:
        for key in ("a", "p", "b"):
            n = row.get(key)
            if isinstance(n, dict) and n.get("id"):
                nodes[n["id"]] = n
        for key in ("r1", "r2"):
            r = row.get(key)
            if isinstance(r, dict) and r.get("id", r.get("source")):
                edges[r.get("id", str(len(edges)))] = r
    return {"nodes": list(nodes.values()), "edges": list(edges.values())}


async def board_overlap(org_ids: list[str], run: RunFn) -> dict:
    """Board members serving across the given organizations.

    Answers: "Which directors connect these three companies?" Powers the
    Network Intelligence panel ("board overlap with X and Y").
    """
    if not org_ids:
        raise ValueError("org_ids must not be empty")
    query = """
    MATCH (p:Person)-[r]->(o)
    WHERE o.id IN $org_ids AND type(r) IN $board_rels
    RETURN p AS person, r, o LIMIT 500
    """
    rows = await run(query, {"org_ids": list(org_ids),
                             "board_rels": list(BOARD_REL_TYPES)})
    people: dict[str, dict] = {}
    orgs: dict[str, dict] = {}
    edges: dict[str, dict] = {}
    for row in rows:
        p, o, r = row.get("person"), row.get("o"), row.get("r")
        if isinstance(p, dict) and p.get("id"):
            people[p["id"]] = p
        if isinstance(o, dict) and o.get("id"):
            orgs[o["id"]] = o
        if isinstance(r, dict) and r.get("id", r.get("source")):
            edges[r.get("id", str(len(edges)))] = r
    return {"nodes": [*orgs.values(), *people.values()],
            "edges": list(edges.values())}


async def timeline(node_id: str, run: RunFn) -> list[dict]:
    """Career/relationship timeline for a node, oldest first.

    Concept §8: edges ordered by start_date (NULLs last = ongoing/unknown).
    Returns [{edge, neighbor}] so the UI can render 1987 → joined X → ...
    """
    query = """
    MATCH (n {id: $node_id})-[r]-(m)
    RETURN r AS edge, m AS neighbor
    ORDER BY r.start_date ASC
    """
    rows = await run(query, {"node_id": node_id})
    out = []
    for row in rows:
        edge, neighbor = row.get("edge"), row.get("neighbor")
        if isinstance(edge, dict):
            out.append({"edge": edge,
                        "neighbor": neighbor if isinstance(neighbor, dict) else {}})
    # NULL start_dates sort first in some stores — push dateless edges last.
    out.sort(key=lambda item: (item["edge"].get("start_date") is None,
                               item["edge"].get("start_date") or ""))
    return out


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
