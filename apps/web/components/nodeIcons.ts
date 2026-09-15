/**
 * Per-type node identity: priority rank, canvas size, ring radius, and a
 * mini icon (white glyph on type-colored badge) rendered instead of bare dots.
 * Priority: Organization > Institution > Family > Person.
 */

const GLYPH = "#fff";

function badge(color: string, inner: string): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>` +
    `<circle cx='32' cy='32' r='30' fill='${color}'/>${inner}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const PERSON_ICON = badge(
  "#2563eb",
  `<circle cx='32' cy='23' r='10' fill='${GLYPH}'/>` +
    `<path d='M14 52c2-11 9-16 18-16s16 5 18 16v1H14v-1z' fill='${GLYPH}'/>`,
);

const ORGANIZATION_ICON = badge(
  "#7c3aed",
  `<rect x='20' y='12' width='24' height='40' rx='2' fill='${GLYPH}'/>` +
    [19, 27, 35].map((y) =>
      [24, 35].map((x) => `<rect x='${x}' y='${y}' width='5' height='5' fill='#7c3aed'/>`).join(""),
    ).join("") +
    `<rect x='28' y='43' width='8' height='9' fill='#7c3aed'/>`,
);

const FAMILY_ICON = badge(
  "#db2777",
  `<circle cx='23' cy='24' r='7' fill='${GLYPH}'/>` +
    `<circle cx='41' cy='24' r='7' fill='${GLYPH}'/>` +
    `<path d='M10 52c1-8 6-12 13-12s12 4 13 12v1H10v-1z' fill='${GLYPH}'/>` +
    `<path d='M28 52c1-8 6-12 13-12s12 4 13 12v1H28v-1z' fill='${GLYPH}'/>`,
);

const INSTITUTION_ICON = badge(
  "#059669",
  `<path d='M10 27L32 12l22 15v2H10v-2z' fill='${GLYPH}'/>` +
    [18, 30, 42].map((x) => `<rect x='${x}' y='31' width='4' height='13' fill='${GLYPH}'/>`).join("") +
    `<rect x='14' y='46' width='36' height='4' rx='1' fill='${GLYPH}'/>`,
);

export interface TypeStyle {
  rank: number;
  color: string;
  size: number;
  ring: number;
  icon: string;
}

export const TYPE_STYLE: Record<string, TypeStyle> = {
  Organization: { rank: 0, color: "#7c3aed", size: 18, ring: 3, icon: ORGANIZATION_ICON },
  Institution: { rank: 1, color: "#059669", size: 13, ring: 5.5, icon: INSTITUTION_ICON },
  Family: { rank: 2, color: "#db2777", size: 10, ring: 8, icon: FAMILY_ICON },
  Person: { rank: 3, color: "#2563eb", size: 7, ring: 10.5, icon: PERSON_ICON },
};

const DEFAULT_STYLE: TypeStyle = {
  rank: 3,
  color: "#64748b",
  size: 7,
  ring: 10.5,
  icon: PERSON_ICON,
};

export function styleFor(label?: string): TypeStyle {
  return (label && TYPE_STYLE[label]) || DEFAULT_STYLE;
}
