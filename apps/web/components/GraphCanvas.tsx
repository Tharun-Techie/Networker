"use client";

import { useEffect, useRef } from "react";
import Graph from "graphology";
import Sigma from "sigma";
import getNodeImageProgram from "sigma/rendering/webgl/programs/node.image";
import type { GraphEdge, GraphNode } from "@/lib/api";
import { TYPE_STYLE, styleFor } from "./nodeIcons";

/**
 * Shared Sigma.js canvas.
 * - Nodes render as type icons (person/building/family/landmark), sized by
 *   type priority: Organization > Institution > Family > Person.
 * - Concentric rings by rank put top-priority types toward the center.
 * - Low-priority nodes are inserted first so icons stack with orgs on top.
 * - Edges are directed arrows (parent → child), colored by confidence.
 */
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
    // Insert low-priority types first so high-priority icons render on top.
    const ordered = [...nodes].sort(
      (a, b) => styleFor(b.label).rank - styleFor(a.label).rank,
    );
    const ringCursor = new Map<number, number>();
    for (const n of ordered) {
      const style = styleFor(n.label);
      const seen = ringCursor.get(style.rank) ?? 0;
      ringCursor.set(style.rank, seen + 1);
      const peers = ordered.filter((m) => styleFor(m.label).rank === style.rank).length;
      const angle = (2 * Math.PI * seen) / Math.max(peers, 1) + style.rank * 0.7;
      if (!graph.hasNode(n.id))
        graph.addNode(n.id, {
          label: n.name,
          x: Math.cos(angle) * style.ring,
          y: Math.sin(angle) * style.ring,
          size: style.size,
          color: style.color,
          type: "image",
          image: style.icon,
        });
    }
    edges.forEach((e) => {
      if (graph.hasNode(e.from_id) && graph.hasNode(e.to_id) && !graph.hasEdge(e.id)) {
        try {
          graph.addEdgeWithKey(e.id, e.from_id, e.to_id, {
            label: e.rel_type,
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
    const renderer = new Sigma(graph, ref.current, {
      nodeProgramClasses: { image: getNodeImageProgram() },
    });
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
        {Object.entries(TYPE_STYLE).map(([t, s]) => (
          <span key={t}>
            <img src={s.icon} alt={t} width={16} height={16} />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
