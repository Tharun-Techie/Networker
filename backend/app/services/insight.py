"""Insight service: LLM summarization seam (built LAST per plan).

Every summary must cite the edge ids it summarizes so the UI can link
through to evidence. No LLM call happens here yet — this formats the
grounded context block an LLM would receive, keeping the product fully
functional without it.
"""

from collections import Counter

from app.schemas import GraphResult

BOARD_RELS = {"director_of", "board_member_of", "chairman_of", "trustee_of"}
WORK_RELS = {"employee_of", "director_of", "board_member_of", "chairman_of",
             "founder_of", "advisor_to"}
FAMILY_RELS = {"parent_of", "child_of", "spouse_of", "sibling_of",
               "family_of", "associated_with"}


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


def summarize(graph: GraphResult) -> dict:
    """MVP network-intelligence summary with strict FACT vs INFERENCE split.

    FACTS: direct restatements of edges (each cites edge ids).
    INFERENCES: patterns worth investigating, explicitly labeled as guesses
    (e.g. shared-employer overlap is NOT closeness). Never promoted to FACT.
    """
    facts: list[dict] = []
    for e in graph.edges:
        facts.append({
            "text": f"{e.from_id} —[{e.rel_type}]→ {e.to_id} "
                    f"({e.start_date or '?'}→{e.end_date or 'ongoing'}, {e.confidence})",
            "edge_ids": [e.id],
        })

    inferences: list[dict] = []
    by_person_board: dict[str, list] = {}
    by_person_work: dict[str, list] = {}
    for e in graph.edges:
        if e.rel_type in BOARD_RELS:
            by_person_board.setdefault(e.from_id, []).append(e)
        if e.rel_type in WORK_RELS:
            by_person_work.setdefault(e.from_id, []).append(e)

    for person, edges in by_person_board.items():
        orgs = {e.to_id for e in edges}
        if len(orgs) > 1:
            inferences.append({
                "kind": "board_overlap",
                "text": f"{person} sits on {len(orgs)} boards in this view "
                        f"({', '.join(sorted(orgs))}) — possible interlock worth checking.",
                "edge_ids": [e.id for e in edges],
            })
    for person, edges in by_person_work.items():
        orgs = {e.to_id for e in edges}
        if len(orgs) > 1:
            inferences.append({
                "kind": "shared_employment",
                "text": f"{person} has ties to {', '.join(sorted(orgs))} — "
                        "shared history, NOT evidence of a current relationship.",
                "edge_ids": [e.id for e in edges],
            })
    family_edges = [e for e in graph.edges if e.rel_type in FAMILY_RELS]
    if family_edges:
        inferences.append({
            "kind": "family_cluster",
            "text": f"{len(family_edges)} family edge(s) in view — kinship, not professional closeness.",
            "edge_ids": [e.id for e in family_edges],
        })

    counts = Counter(e.rel_type for e in graph.edges)
    headline = (
        f"{len(graph.nodes)} nodes, {len(graph.edges)} edges; "
        + (f"top ties: {', '.join(f'{k}×{v}' for k, v in counts.most_common(3))}."
           if counts else "no edges in view.")
    )
    return {
        "headline": headline,
        "facts": facts,
        "inferences": inferences,  # guesses — UI must render under a separate heading
        "citations": [e.id for e in graph.edges],
        "context": build_grounded_context(graph),
    }
