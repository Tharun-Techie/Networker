"use client";

import { useEffect, useRef } from "react";
import Graph from "graphology";
import Sigma from "sigma";
import type { GraphEdge, GraphNode } from "@/lib/api";

const TYPE_COLORS: Record<string, string> = {
  Person: "#2563eb",
  Organization: "#7c3aed",
  Family: "#db2777",
  Institution: "#059669",
};

/** Shared Sigma.js canvas (client component — Sigma needs the DOM). */
export default function GraphCanvas({
  nodes,
  edges,
  onSelectEdge,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onSelectEdge?: (e: GraphEdge) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const edgesRef = useRef(edges);
  edgesRef.current = edges;

  useEffect(() => {
    if (!ref.current) return;
    const graph = new Graph();
    nodes.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / Math.max(nodes.length, 1);
      if (!graph.hasNode(n.id))
        graph.addNode(n.id, {
          label: n.name,
          x: Math.cos(angle) * 10,
          y: Math.sin(angle) * 10,
          size: 8,
          color: (n.label && TYPE_COLORS[n.label]) || "#2563eb",
        });
    });
    edges.forEach((e) => {
      if (graph.hasNode(e.from_id) && graph.hasNode(e.to_id) && !graph.hasEdge(e.id)) {
        try {
          graph.addEdgeWithKey(e.id, e.from_id, e.to_id, {
            label: e.rel_type,
            // Directed edge: arrow head shows parent → child (owns, reports_to…)
            type: "arrow",
            size: 2,
            color:
              e.confidence === "verified"
                ? "#16a34a"
                : e.confidence === "inferred"
                  ? "#d97706"
                  : "#9ca3af",
          });
        } catch {
          /* duplicate */
        }
      }
    });
    const renderer = new Sigma(graph, ref.current);
    renderer.on("clickEdge", ({ edge }) => {
      const found = edgesRef.current.find((x) => x.id === edge);
      if (found && onSelectEdge) onSelectEdge(found);
    });
    return () => renderer.kill();
  }, [nodes, edges, onSelectEdge]);

  return (
    <div className="graph-wrap">
      <div ref={ref} className="graph-canvas" />
      <div className="graph-legend">
        {Object.entries(TYPE_COLORS).map(([t, c]) => (
          <span key={t}>
            <span className="dot" style={{ background: c }} />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
