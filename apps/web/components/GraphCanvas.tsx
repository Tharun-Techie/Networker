"use client";

import { useEffect, useRef } from "react";
import Graph from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";
import Sigma from "sigma";
import getNodeImageProgram from "sigma/rendering/webgl/programs/node.image";
import type { GraphEdge, GraphNode } from "@/lib/api";
import { TYPE_STYLE, styleFor } from "./nodeIcons";

/** Target width (graph units) the layout is normalized into. */
const LAYOUT_WIDTH = 24;

/**
 * Force-directed layout (ForceAtlas2) + normalization.
 * Replaces fixed rings: connected nodes settle close together, so edges stay
 * short; low gravity keeps isolated nodes near their initial spread instead
 * of piling in the center.
 */
function runLayout(graph: Graph): void {
  if (graph.order === 0) return;
  if (graph.order === 1 || graph.size === 0) {
    let i = 0;
    graph.forEachNode((n) => {
      graph.setNodeAttribute(n, "x", Math.cos((2 * Math.PI * i) / graph.order) * 6);
      graph.setNodeAttribute(n, "y", Math.sin((2 * Math.PI * i) / graph.order) * 6);
      i++;
    });
  } else {
    const settings = forceAtlas2.inferSettings(graph);
    forceAtlas2.assign(graph, {
      iterations: Math.min(400, 80 + graph.order * 3),
      settings: {
        ...settings,
        gravity: 0.1,
        adjustSizes: true,
        barnesHutOptimize: graph.order > 100,
        barnesHutTheta: 0.6,
      },
    });
  }
  // Normalize into a predictable box so the camera fit is stable.
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  graph.forEachNode((n, a) => {
    xMin = Math.min(xMin, a.x);
    xMax = Math.max(xMax, a.x);
    yMin = Math.min(yMin, a.y);
    yMax = Math.max(yMax, a.y);
  });
  const w = Math.max(xMax - xMin, 1);
  const h = Math.max(yMax - yMin, 1);
  const scale = LAYOUT_WIDTH / Math.max(w, h);
  const cx = (xMin + xMax) / 2;
  const cy = (yMin + yMax) / 2;
  graph.forEachNode((n, a) => {
    graph.setNodeAttribute(n, "x", (a.x - cx) * scale);
    graph.setNodeAttribute(n, "y", (a.y - cy) * scale);
  });
}

/**
 * Shared Sigma.js canvas.
 * - Type icons sized by priority (Organization > Institution > Family > Person),
 *   high-priority icons stacked on top.
 * - Force-directed layout keeps related nodes close (short edges).
 * - Nodes are draggable; Fit frames every node; Layout re-runs the algorithm.
 * - Directed arrows, colored by confidence.
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
  const controlsRef = useRef<{ fit: () => void; relayout: () => void } | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const container = ref.current;
    const graph = new Graph();
    // Insert low-priority types first so high-priority icons render on top.
    const ordered = [...nodes].sort((a, b) => styleFor(b.label).rank - styleFor(a.label).rank);
    // Spread initial positions on rings so isolates start separated.
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
    runLayout(graph);

    const renderer = new Sigma(graph, container, {
      nodeProgramClasses: { image: getNodeImageProgram() },
    });

    const fit = () => {
      if (graph.order === 0) return;
      let xMin = Infinity;
      let xMax = -Infinity;
      let yMin = Infinity;
      let yMax = -Infinity;
      graph.forEachNode((n, a) => {
        xMin = Math.min(xMin, a.x);
        xMax = Math.max(xMax, a.x);
        yMin = Math.min(yMin, a.y);
        yMax = Math.max(yMax, a.y);
      });
      const rect = container.getBoundingClientRect();
      const ratio = Math.max(
        Math.max(xMax - xMin, 1) / Math.max(rect.width, 1),
        Math.max(yMax - yMin, 1) / Math.max(rect.height, 1),
      );
      renderer.getCamera().animate(
        { x: (xMin + xMax) / 2, y: (yMin + yMax) / 2, ratio: ratio * 1.2 },
        { duration: 400 },
      );
    };

    const relayout = () => {
      runLayout(graph);
      renderer.refresh();
      fit();
    };
    controlsRef.current = { fit, relayout };
    fit();

    renderer.on("clickEdge", ({ edge }) => {
      const found = edgesRef.current.find((x) => x.id === edge);
      if (found && onSelectEdge) onSelectEdge(found);
    });

    // Drag nodes: grab on mousedown, move with the pointer, release on mouseup.
    let dragged: string | null = null;
    const onDownNode = (e: { node: string }) => {
      dragged = e.node;
      renderer.getCamera().disable();
      container.style.cursor = "grabbing";
    };
    const onMove = (e: { x: number; y: number; preventSigmaDefault: () => void }) => {
      if (!dragged) return;
      e.preventSigmaDefault();
      const pos = renderer.viewportToGraph(e);
      graph.setNodeAttribute(dragged, "x", pos.x);
      graph.setNodeAttribute(dragged, "y", pos.y);
      renderer.refresh();
    };
    const onUp = () => {
      if (!dragged) return;
      dragged = null;
      renderer.getCamera().enable();
      container.style.cursor = "";
    };
    const onEnterNode = () => {
      if (!dragged) container.style.cursor = "grab";
    };
    const onLeaveNode = () => {
      if (!dragged) container.style.cursor = "";
    };
    renderer.on("downNode", onDownNode);
    renderer.getMouseCaptor().on("mousemovebody", onMove);
    renderer.getMouseCaptor().on("mouseup", onUp);
    renderer.on("enterNode", onEnterNode);
    renderer.on("leaveNode", onLeaveNode);

    return () => {
      controlsRef.current = null;
      renderer.kill();
    };
  }, [nodes, edges, onSelectEdge]);

  return (
    <div className="graph-wrap">
      <div ref={ref} className="graph-canvas" />
      <div className="graph-actions">
        <button type="button" className="btn-sm" onClick={() => controlsRef.current?.fit()}>
          ⤢ Fit
        </button>
        <button type="button" className="btn-sm" onClick={() => controlsRef.current?.relayout()}>
          ⟲ Layout
        </button>
      </div>
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
