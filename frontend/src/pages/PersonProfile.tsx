import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, type GraphResult } from "../api";
import GraphCanvas from "../components/GraphCanvas";

/** Person profile: structured panels (timeline, boards, family) ABOVE the
 *  graph — a pure graph view is hard to scan for basic facts. */
export default function PersonProfile() {
  const { id = "" } = useParams();
  const [graph, setGraph] = useState<GraphResult>({ nodes: [], edges: [] });

  useEffect(() => {
    api.expand(id, 1).then(setGraph).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const me = graph.nodes.find((n) => n.id === id);
  const roles = graph.edges.filter((e) => e.from_id === id || e.to_id === id);

  return (
    <div>
      <h2>{me?.name ?? id}</h2>
      <h3>Career timeline</h3>
      <ul>
        {roles.map((r) => (
          <li key={r.id}>
            {r.rel_type}: {r.from_id} → {r.to_id} ({r.start_date ?? "?"}–{r.end_date ?? "ongoing"}) [
            {r.confidence}]
          </li>
        ))}
      </ul>
      <GraphCanvas nodes={graph.nodes} edges={graph.edges} />
    </div>
  );
}
