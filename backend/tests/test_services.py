import asyncio

import pytest

from app.schemas import Confidence, EdgeCreate, NodeCreate, NodeType, RelType
from app.services import entity_resolution as er
from app.services import graph_service


@pytest.fixture
def fake_run():
    calls = []

    async def run(query, params=None):
        calls.append((query, params))
        if "CREATE (n" in query:
            return [{"n": {"id": params["id"], "name": params["name"]}}]
        if "CREATE (a)-[r" in query:
            return [{"r": {"id": "e1", "confidence": params["confidence"]}}]
        if "shortestPath" in query:
            return [{"nodes": [{"id": "a"}], "edges": [{"id": "e1"}]}]
        if "RETURN c AS node" in query:
            return [{"node": {"id": "c1"}}]
        if "SET r.confidence" in query:
            return [{"r": {"id": params["edge_id"], "confidence": params["confidence"]}}]
        return [{"src": {"id": "a"}, "n": {"id": "b"}, "r": {"id": "e1"}}]

    run.calls = calls
    return run


def test_expand_query_depth_clamped():
    q = graph_service.build_expand_query(99, None, None, None)
    assert "*1..4" in q


def test_expand_query_validates_rel():
    try:
        graph_service.build_expand_query(1, ["not_a_rel"], None, None)
    except ValueError:
        pass
    else:
        raise AssertionError("expected ValueError")


def test_create_edge_marks_params(fake_run):
    data = EdgeCreate(rel_type=RelType.DIRECTOR_OF, from_id="a", to_id="b",
                      source="ev1", confidence=Confidence.INFERRED)
    out = asyncio.run(graph_service.create_edge(data, fake_run))
    assert out["confidence"] == "inferred"
    _, params = fake_run.calls[0]
    assert params["source"] == "ev1"


def test_verified_promotion_requires_actor(fake_run):
    try:
        asyncio.run(graph_service.update_edge_confidence("e1", Confidence.VERIFIED, "", fake_run))
    except ValueError:
        pass
    else:
        raise AssertionError("expected ValueError")


def test_name_score_last_name_mismatch_capped():
    assert er.name_score("Ratan Tata", "Ratan Singh") <= 0.5
    assert er.name_score("N. Chandrasekaran", "Natarajan Chandrasekaran") > 0.7


def test_duplicate_detection_aliases():
    assert er.is_duplicate("N. Chandrasekaran", [], "Natarajan Chandrasekaran", [])
