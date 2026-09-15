"""Insight service: LLM summarization seam (built LAST per plan).

Every summary must cite the edge ids it summarizes so the UI can link
through to evidence. No LLM call happens here yet — this formats the
grounded context block an LLM would receive, keeping the product fully
functional without it.
"""

from app.schemas import GraphResult


def build_grounded_context(graph: GraphResult) -> str:
    lines = []
    for e in graph.edges:
        lines.append(
            f"- edge {e.id}: {e.from_id} -[{e.rel_type}|{e.confidence}]→ {e.to_id} "
            f"(source={e.source}, {e.start_date}→{e.end_date})"
        )
    return "\n".join(lines)


def placeholder_summary(graph: GraphResult) -> dict:
    return {
        "summary": f"Subgraph with {len(graph.nodes)} nodes and {len(graph.edges)} edges. "
        "LLM insight not configured — showing edge-level facts only.",
        "citations": [e.id for e in graph.edges],
        "context": build_grounded_context(graph),
    }
