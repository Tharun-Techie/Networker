/**
 * Entity resolution: pure, testable duplicate scoring for background merges.
 * Ported from backend/app/services/entity_resolution.py.
 *
 * Scoring mirrors CPython's difflib.SequenceMatcher (gestalt ratio over
 * recursive longest-match blocks; autojunk never triggers on short names),
 * so thresholds behave the same as the Python service.
 */

export function normalize(name: string): string {
  let s = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  s = s.toLowerCase();
  s = s.replace(/[.\-_,]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  s = s.replace(/^(mr|mrs|ms|dr|prof)\s+/, "");
  return s;
}

/** Gestalt ratio a.k.a. difflib.SequenceMatcher(None, a, b).ratio(). */
export function gestaltRatio(a: string, b: string): number {
  const m = matchingBlocks(a, b);
  let matched = 0;
  for (const [, , size] of m) matched += size;
  const total = a.length + b.length;
  return total === 0 ? 1 : (2 * matched) / total;
}

type Triple = [number, number, number]; // alo, blo, size

function buildIndex(s: string): Map<string, number[]> {
  const idx = new Map<string, number[]>();
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    const list = idx.get(ch);
    if (list) list.push(i);
    else idx.set(ch, [i]);
  }
  return idx;
}

function findLongestMatch(
  a: string,
  bIdx: Map<string, number[]>,
  b: string,
  alo: number,
  ahi: number,
  blo: number,
  bhi: number,
): Triple {
  let bestI = alo;
  let bestJ = blo;
  let bestSize = 0;
  // j2len: longest match ending at each b position (difflib algorithm)
  let j2len = new Map<number, number>();
  for (let i = alo; i < ahi; i++) {
    const newJ2len = new Map<number, number>();
    for (const j of bIdx.get(a[i]!) ?? []) {
      if (j < blo) continue;
      if (j >= bhi) break;
      const k = (j2len.get(j - 1) ?? 0) + 1;
      newJ2len.set(j, k);
      if (k > bestSize) {
        bestI = i - k + 1;
        bestJ = j - k + 1;
        bestSize = k;
      }
    }
    j2len = newJ2len;
  }
  // Extend match with non-junk — no junk defined, so extend greedily both ways
  while (bestI > alo && bestJ > blo && a[bestI - 1] === b[bestJ - 1]) {
    bestI--;
    bestJ--;
    bestSize++;
  }
  while (bestI + bestSize < ahi && bestJ + bestSize < bhi && a[bestI + bestSize] === b[bestJ + bestSize]) {
    bestSize++;
  }
  return [bestI, bestJ, bestSize];
}

function matchingBlocks(a: string, b: string): Triple[] {
  const bIdx = buildIndex(b);
  const queue: Array<[number, number, number, number]> = [[0, a.length, 0, b.length]];
  const matches: Triple[] = [];
  while (queue.length > 0) {
    const [alo, ahi, blo, bhi] = queue.pop()!;
    const [i, j, k] = findLongestMatch(a, bIdx, b, alo, ahi, blo, bhi);
    if (k > 0) {
      matches.push([i, j, k]);
      if (alo < i && blo < j) queue.push([alo, i, blo, j]);
      if (i + k < ahi && j + k < bhi) queue.push([i + k, ahi, j + k, bhi]);
    }
  }
  matches.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  matches.push([a.length, b.length, 0]);
  return matches;
}

function tokenOverlap(ta: Set<string>, tb: Set<string>): number {
  // Single-letter initials count as prefix matches ('n' ~ 'natarajan').
  if (ta.size === 0 || tb.size === 0) return 0;
  const [small, big] = ta.size <= tb.size ? [ta, tb] : [tb, ta];
  let matched = 0;
  for (const tok of small) {
    if (big.has(tok)) matched++;
    else if (tok.length === 1 && [...big].some((b) => b.startsWith(tok))) matched++;
  }
  return matched / Math.max(ta.size, tb.size);
}

export function nameScore(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const ta = new Set(na.split(" "));
  const tb = new Set(nb.split(" "));
  const overlap = tokenOverlap(ta, tb);
  const seq = gestaltRatio(na, nb);
  // Last-token (family name) must match for a merge candidate.
  const la = na.split(" ").at(-1);
  const lb = nb.split(" ").at(-1);
  if (la !== lb) return Math.min(seq, 0.5);
  return Math.max(seq, 0.55 + 0.4 * overlap);
}

export function isDuplicate(
  a: string,
  aliasesA: string[],
  b: string,
  aliasesB: string[],
  threshold = 0.85,
): boolean {
  const names = [a, ...aliasesA];
  const others = [b, ...aliasesB];
  return names.some((x) => others.some((y) => nameScore(x, y) >= threshold));
}

export interface CandidateNode {
  id: string;
  name: string;
  aliases?: string[];
}

export async function findDuplicateCandidates(
  nodes: CandidateNode[],
  threshold = 0.85,
): Promise<Array<[string, string, number]>> {
  // Blocking by last-token of normalized name, then pairwise scoring.
  const blocks = new Map<string, CandidateNode[]>();
  for (const n of nodes) {
    const parts = normalize(n.name).split(" ");
    const key = parts.at(-1) ?? "";
    const group = blocks.get(key) ?? [];
    group.push(n);
    blocks.set(key, group);
  }
  const out: Array<[string, string, number]> = [];
  for (const group of blocks.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const x = group[i]!;
        const y = group[j]!;
        const s = nameScore(x.name, y.name);
        if (
          s >= threshold ||
          isDuplicate(x.name, x.aliases ?? [], y.name, y.aliases ?? [], threshold)
        ) {
          out.push([x.id, y.id, Math.round(s * 1000) / 1000]);
        }
      }
    }
  }
  return out;
}
