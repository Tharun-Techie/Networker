import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, type GraphResult } from "../api";
import GraphCanvas from "../components/GraphCanvas";

export default function OrgProfile() {
  const { id = "" } = useParams();
  const [graph, setGraph] = useState<GraphResult>({ nodes: [], edges: [] });

  useEffect(() => {
    api.expand(id, 1).then(setGraph).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const me = graph.nodes.find((n) => n.id === id);
  return (
    <div>
      <h2>{me?.name ?? id}</h2>
      <h3>People & affiliations</h3>
      <ul>
        {graph.edges.map((r) => (
          <li key={r.id}>
            {r.rel_type}: {r.from_id} → {r.to_id} [{r.confidence}]
          </li>
        ))}
      </ul>
      <GraphCanvas nodes={graph.nodes} edges={graph.edges} />
    </div>
  );
}
