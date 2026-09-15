import { useState } from "react";
import { Link } from "react-router-dom";
import { api, type GraphResult, type SearchHit } from "../api";
import GraphCanvas from "../components/GraphCanvas";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [label, setLabel] = useState("");
  const [result, setResult] = useState<GraphResult>({ nodes: [], edges: [] });

  const run = (fn: Promise<GraphResult>, what: string) =>
    fn.then((r) => { setResult(r); setLabel(what); }).catch(() => {});

  return (
    <div>
      <h2>Search / Query</h2>
      <p className="subtle">Fuzzy name search, then relationship queries between any two nodes.</p>

      <div className="card">
        <div className="searchbar">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && api.search(q).then(setHits).catch(() => {})}
            placeholder="Fuzzy name search…"
          />
          <button className="btn-primary" onClick={() => api.search(q).then(setHits).catch(() => {})}>
            Search
          </button>
        </div>
        {hits.length > 0 && (
          <ul className="list">
            {hits.map((h) => (
              <li key={h.id}>
                <span className={`badge b-type-${h.label}`}>{h.label}</span>
                <Link className="grow" to={h.label === "Organization" ? `/org/${h.id}` : `/person/${h.id}`}>
                  <strong>{h.name}</strong>
                </Link>
                <span className="tiny mono">{h.score.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h3>Relationship queries</h3>
        <p className="tiny">
          Paste two node ids (tip: search above, ids appear in Explore). Example seed ids:{" "}
          <span className="mono">org-tata-sons</span>, <span className="mono">org-tata-motors</span>,{" "}
          <span className="mono">org-tcs</span>, <span className="mono">org-tata-capital</span>
        </p>
        <div className="row wrap">
          <input value={a} onChange={(e) => setA(e.target.value)} placeholder="node A id" />
          <input value={b} onChange={(e) => setB(e.target.value)} placeholder="node B id" />
        </div>
        <div className="row wrap mt">
          <button onClick={() => run(api.common(a, b), "Common connections")}>Common connections</button>
          <button onClick={() => run(api.path(a, b), "Shortest path")}>Shortest path</button>
          <button className="btn-primary" onClick={() => run(api.connectors(a, b), "People connecting A and B")}>
            Who connects A and B?
          </button>
          <button onClick={() => run(api.sharedEmployment(a, b), "Worked at both")}>
            Worked at both (orgs)
          </button>
        </div>
      </div>

      {(label || result.nodes.length > 0) && (
        <div className="card">
          <h3>
            {label || "Result"}{" "}
            <span className="tiny">{result.nodes.length} nodes · {result.edges.length} edges</span>
          </h3>
          <GraphCanvas nodes={result.nodes} edges={result.edges} />
        </div>
      )}
    </div>
  );
}
