import type { GraphEdge } from "../api";

/** Evidence side-panel: clicking an edge shows source, dates, confidence. */
export default function EvidencePanel({ edge }: { edge: GraphEdge | null }) {
  if (!edge) return <p>Select an edge in the graph to see its evidence.</p>;
  return (
    <div style={{ border: "1px solid #e5e7eb", padding: 12 }}>
      <h3>{edge.rel_type}</h3>
      <p>
        {edge.from_id} → {edge.to_id}
      </p>
      <p>
        Confidence: <strong>{edge.confidence}</strong>
      </p>
      <p>
        Period: {edge.start_date ?? "?"} → {edge.end_date ?? "ongoing"}
      </p>
      <p>Source (evidence ID): {edge.source}</p>
    </div>
  );
}
