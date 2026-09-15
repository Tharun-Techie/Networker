"""Ingestion service: source doc -> candidate entities/relationships.

Early stage: manual entry + simple extraction. LLM extraction (later) MUST
write edges with confidence=inferred. This module is the seam: extractors
return candidate dicts; persistence always forces inferred unless a human
explicitly verifies.
"""

from app.schemas import Confidence, EdgeCreate, NodeCreate


async def persist_candidates(nodes: list[NodeCreate], edges: list[EdgeCreate], run) -> dict:
    from app.services import graph_service

    created_nodes, created_edges = [], []
    for n in nodes:
        created_nodes.append(await graph_service.create_node(n, run))
    for e in edges:
        if e.confidence == Confidence.VERIFIED:
            # Never allow auto-ingest to write verified directly.
            e.confidence = Confidence.INFERRED
        created_edges.append(await graph_service.create_edge(e, run))
    return {"nodes": created_nodes, "edges": created_edges}
