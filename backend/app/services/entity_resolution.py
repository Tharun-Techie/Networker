"""Entity resolution: background merge of duplicate nodes.

Strategy (decide early, per plan): normalized-name + alias overlap blocking,
then Jaro-Winkler-ish scoring. Merges are explicit (survivor + retired ids)
and logged to audit — never silent. This module implements the pure,
testable scoring; the Neo4j rewrite runs as an arq background job.
"""

import re
import unicodedata
from difflib import SequenceMatcher


def normalize(name: str) -> str:
    name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    name = name.lower()
    name = re.sub(r"[.\-_,]", " ", name)
    name = re.sub(r"\s+", " ", name).strip()
    # Expand common initials pattern "n chandrasekaran" stays as-is; drop titles
    name = re.sub(r"^(mr|mrs|ms|dr|prof)\s+", "", name)
    return name


def _token_overlap(ta: set[str], tb: set[str]) -> float:
    """Overlap counting single-letter initials as prefix matches ('n' ~ 'natarajan')."""
    if not ta or not tb:
        return 0.0
    small, big = (ta, tb) if len(ta) <= len(tb) else (tb, ta)
    matched = 0
    for tok in small:
        if tok in big:
            matched += 1
        elif len(tok) == 1 and any(b.startswith(tok) for b in big):
            matched += 1
    return matched / max(len(ta), len(tb))


def name_score(a: str, b: str) -> float:
    na, nb = normalize(a), normalize(b)
    if not na or not nb:
        return 0.0
    if na == nb:
        return 1.0
    # token-set overlap boosts "N Chandrasekaran" vs "Natarajan Chandrasekaran"
    ta, tb = set(na.split()), set(nb.split())
    overlap = _token_overlap(ta, tb)
    seq = SequenceMatcher(None, na, nb).ratio()
    # last-token (family name) must match for a merge candidate
    if na.split()[-1] != nb.split()[-1]:
        return min(seq, 0.5)
    return max(seq, 0.55 + 0.4 * overlap)


def is_duplicate(a: str, aliases_a: list[str], b: str, aliases_b: list[str],
                 threshold: float = 0.85) -> bool:
    names = [a, *aliases_a]
    others = [b, *aliases_b]
    return any(name_score(x, y) >= threshold for x in names for y in others)


async def find_duplicate_candidates(nodes: list[dict], threshold: float = 0.85) -> list[tuple[str, str, float]]:
    """Blocking by last-token of normalized name, then pairwise scoring."""
    blocks: dict[str, list[dict]] = {}
    for n in nodes:
        last = normalize(n.get("name", "")).split()
        key = last[-1] if last else ""
        blocks.setdefault(key, []).append(n)
    out: list[tuple[str, str, float]] = []
    for group in blocks.values():
        for i in range(len(group)):
            for j in range(i + 1, len(group)):
                a, b = group[i], group[j]
                s = name_score(a.get("name", ""), b.get("name", ""))
                if s >= threshold or is_duplicate(
                    a.get("name", ""), a.get("aliases", []),
                    b.get("name", ""), b.get("aliases", []), threshold,
                ):
                    out.append((a["id"], b["id"], round(s, 3)))
    return out
