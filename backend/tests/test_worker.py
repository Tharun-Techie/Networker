import asyncio

from app import worker


def test_worker_registers_jobs_and_cron():
    names = [f.__name__ for f in worker.WorkerSettings.functions]
    assert names == ["ingest_candidates", "scan_duplicates", "enrich_node"]
    assert len(worker.WorkerSettings.cron_jobs) == 1


def test_scan_duplicates_returns_candidates_not_merges():
    async def fake_run(query, params=None):
        return [
            {"id": "1", "name": "N. Chandrasekaran", "aliases": []},
            {"id": "2", "name": "Natarajan Chandrasekaran", "aliases": []},
            {"id": "3", "name": "Ratan Tata", "aliases": []},
        ]

    out = asyncio.run(worker.scan_duplicates({"run": fake_run}))
    assert len(out["candidates"]) == 1
    assert out["candidates"][0]["a"] == "1"


def test_ingest_forces_inferred_even_from_worker():
    seen = []

    async def fake_run(query, params=None):
        seen.append(params)
        if "CREATE (n" in query:
            return [{"n": {"id": params["id"]}}]
        return [{"r": {"id": "e1", "confidence": params["confidence"]}}]

    out = asyncio.run(
        worker.ingest_candidates(
            {"run": fake_run},
            nodes=[{"type": "Person", "name": "Test Person"}],
            edges=[{
                "rel_type": "director_of", "from_id": "a", "to_id": "b",
                "source": "ev1", "confidence": "verified",  # must be downgraded
            }],
        )
    )
    assert out == {"nodes": 1, "edges": 1}
    edge_params = [p for p in seen if p and "confidence" in p]
    assert edge_params and all(p["confidence"] == "inferred" for p in edge_params)


def test_enrich_node_unknown_id():
    async def fake_run(query, params=None):
        return []

    try:
        asyncio.run(worker.enrich_node({"run": fake_run}, node_id="missing"))
    except ValueError:
        pass
    else:
        raise AssertionError("expected ValueError")
