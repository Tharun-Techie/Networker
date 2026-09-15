"use client";

import { type GraphNode } from "@/lib/api";
import Typeahead from "./Typeahead";

export default function NodePicker({
  label,
  value,
  onPick,
}: {
  label: string;
  value: GraphNode | null;
  onPick: (n: GraphNode | null) => void;
}) {
  return (
    <div>
      <label className="flabel">{label}</label>
      {value ? (
        <div className="row wrap">
          <span className="badge b-type-Organization">{value.name}</span>
          <span className="tiny mono">{value.id}</span>
          <button type="button" className="btn-sm btn-ghost" onClick={() => onPick(null)}>
            change
          </button>
        </div>
      ) : (
        <Typeahead
          placeholder={`Type to search ${label.toLowerCase()}…`}
          fetchOptions={async (query, signal) => {
            const res = await fetch(
              `/api/search?q=${encodeURIComponent(query)}&limit=8`,
              { signal },
            );
            if (!res.ok) throw new Error("search failed");
            const hits = (await res.json()) as Array<{
              id: string;
              label: string;
              name: string;
              score: number;
            }>;
            return hits.map((h) => ({
              id: h.id,
              primary: h.name,
              secondary: `match ${h.score.toFixed(2)}`,
              badge: h.label,
            }));
          }}
          onSelect={(opt) =>
            onPick({
              id: opt.id,
              name: opt.primary,
              label: opt.badge,
            })
          }
        />
      )}
    </div>
  );
}
