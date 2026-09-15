"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface TypeaheadOption {
  id: string;
  primary: string;
  secondary?: string;
  badge?: string;
}

/**
 * Reusable typeahead combobox: debounced async fetch, stale-request abort,
 * full keyboard navigation (↑/↓/Enter/Esc), ARIA listbox semantics.
 */
export default function Typeahead({
  placeholder,
  minChars = 1,
  debounceMs = 250,
  fetchOptions,
  onSelect,
  onQueryChange,
}: {
  placeholder?: string;
  minChars?: number;
  debounceMs?: number;
  fetchOptions: (q: string, signal: AbortSignal) => Promise<TypeaheadOption[]>;
  onSelect: (opt: TypeaheadOption) => void;
  onQueryChange?: (q: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<TypeaheadOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const fetchRef = useRef(fetchOptions);
  fetchRef.current = fetchOptions;
  const queryRef = useRef(onQueryChange);
  queryRef.current = onQueryChange;
  const listId = useId();

  useEffect(() => {
    queryRef.current?.(query);
    if (query.trim().length < minChars) {
      setOptions([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const opts = await fetchRef.current(query.trim(), ctrl.signal);
        if (ctrl.signal.aborted) return;
        setOptions(opts);
        setOpen(true);
        setActive(opts.length > 0 ? 0 : -1);
      } catch {
        if (!ctrl.signal.aborted) {
          setOptions([]);
          setOpen(false);
        }
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, debounceMs);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, minChars, debounceMs]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const choose = (opt: TypeaheadOption) => {
    setOpen(false);
    setQuery("");
    setOptions([]);
    setActive(-1);
    onSelect(opt);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (options.length > 0 ? (a + 1) % options.length : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) =>
        options.length > 0 ? (a - 1 + options.length) % options.length : -1,
      );
    } else if (e.key === "Enter") {
      if (open && active >= 0 && options[active]) {
        e.preventDefault();
        choose(options[active]!);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showEmpty = open && !loading && query.trim().length >= minChars && options.length === 0;

  return (
    <div className="ta-box" ref={boxRef}>
      <div className="searchbar">
        <input
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          aria-autocomplete="list"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (options.length > 0) setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
        />
        {loading && <span className="ta-spinner" aria-label="loading" />}
      </div>
      {open && options.length > 0 && (
        <ul className="ta-list" role="listbox" id={listId}>
          {options.map((o, i) => (
            <li
              key={o.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={`ta-item${i === active ? " active" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(o);
              }}
              onMouseEnter={() => setActive(i)}
            >
              {o.badge && <span className={`badge b-type-${o.badge}`}>{o.badge}</span>}
              <span className="grow">
                <strong>{o.primary}</strong>
                {o.secondary && <span className="tiny"> · {o.secondary}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {showEmpty && <div className="ta-empty">No matches — try a different spelling.</div>}
    </div>
  );
}
