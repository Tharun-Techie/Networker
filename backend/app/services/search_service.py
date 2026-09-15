"""Search: OpenSearch when available, Neo4j full-text fallback, 503 otherwise."""

from typing import Any


async def search_nodes(q: str, limit: int = 20) -> list[dict[str, Any]]:
    q = (q or "").strip()
    if not q:
        return []
    # 1. Try OpenSearch
    try:
        from opensearchpy import OpenSearch

        from app.config import settings

        client = OpenSearch(settings.opensearch_url)
        if client.indices.exists(index="nodes"):
            resp = client.search(
                index="nodes",
                body={
                    "size": limit,
                    "query": {
                        "multi_match": {"query": q, "fields": ["name^3", "aliases", "attributes.*"]}
                    },
                },
            )
            return [
                {"id": h["_id"], "label": h["_source"].get("type", "?"),
                 "name": h["_source"].get("name", ""), "score": h["_score"]}
                for h in resp["hits"]["hits"]
            ]
    except Exception:
        pass
    # 2. Neo4j full-text fallback
    try:
        from app.db_neo4j import run_read

        rows = await run_read(
            "CALL db.index.fulltext.queryNodes('node_names_ft', $q) "
            "YIELD node, score RETURN node, score ORDER BY score DESC LIMIT $limit",
            {"q": q, "limit": limit},
        )
        out = []
        for r in rows:
            from app.services.graph_service import _clean_node
            n = _clean_node(r.get("node", {}))
            out.append({"id": n.get("id"), "label": "?",
                        "name": n.get("name"), "score": r.get("score", 1.0)})
        return out
    except Exception as exc:
        raise RuntimeError(f"Search unavailable (no OpenSearch, Neo4j error: {exc})")
