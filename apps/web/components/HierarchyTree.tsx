"use client";

import Link from "next/link";
import { useState } from "react";
import type { GraphNode, TreeNode } from "@/lib/api";

function profileHref(node: GraphNode): string | null {
  if (node.label === "Organization") return `/org/${node.id}`;
  if (node.label === "Person") return `/person/${node.id}`;
  return null;
}

function TreeItem({ tree, depth }: { tree: TreeNode; depth: number }) {
  const [open, setOpen] = useState(depth < 2);
  const kids = tree.children;
  const href = profileHref(tree.node);
  const name = (
    <strong>{tree.node.name}</strong>
  );
  return (
    <li className="tree-item">
      <div className="row">
        {kids.length > 0 ? (
          <button
            type="button"
            className="tree-toggle"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? "▾" : "▸"}
          </button>
        ) : (
          <span className="tree-leaf">•</span>
        )}
        {tree.node.label && (
          <span className={`badge b-type-${tree.node.label}`}>{tree.node.label}</span>
        )}
        <span className="grow">
          {href ? <Link href={href}>{name}</Link> : name}{" "}
          {tree.edge && <span className="tiny mono">← {tree.edge.rel_type}</span>}
        </span>
        {tree.edge && (
          <span
            className={`badge ${
              tree.edge.confidence === "verified"
                ? "b-verified"
                : tree.edge.confidence === "inferred"
                  ? "b-inferred"
                  : "b-unconfirmed"
            }`}
          >
            {tree.edge.confidence}
          </span>
        )}
      </div>
      {tree.spouses && tree.spouses.length > 0 && (
        <div className="tiny tree-spouse">
          ⚭ {tree.spouses.map((s) => s.name).join(", ")}
        </div>
      )}
      {kids.length > 0 && open && (
        <ul className="tree">
          {kids.map((c) => (
            <TreeItem key={c.node.id} tree={c} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Collapsible hierarchy tree (ownership / family / reporting). */
export default function HierarchyTree({ tree }: { tree: TreeNode }) {
  return (
    <ul className="tree tree-root">
      <TreeItem tree={tree} depth={0} />
    </ul>
  );
}
