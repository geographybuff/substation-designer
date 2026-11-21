/**
 * Shared types for data extracted from USDA RUS Bulletin 1724E-300,
 * "Design Guide for Rural Substations" (June 2001).
 *
 * Every number the game treats as fact should carry a Citation so the
 * in-game Field Guide and design-review messages can point players back
 * to the exact place in the bulletin. Bulletin page numbers are identical
 * to PDF page numbers (the cover is page 1).
 */

export interface Citation {
  /** Bulletin page number(s), e.g. 154 or [142, 145]. */
  page: number | [number, number];
  /** Section number, e.g. "4.9" or "9.10.4". */
  section?: string;
  /** Table id as printed, e.g. "4-7". */
  table?: string;
  /** Figure id as printed, e.g. "4-21". */
  figure?: string;
  /** Equation id as printed, e.g. "9-12". */
  equation?: string;
  /** Upstream standard the bulletin itself cites for this item, e.g. "ANSI C37.32-1996, Table 5". */
  originalSource?: string;
  /** Free-form clarification (units, interpretation, caveats). */
  note?: string;
}

/** A value with its provenance. */
export interface Sourced<T> {
  value: T;
  cite: Citation;
}

/** A short paraphrased guidance statement (not a verbatim quote) with its provenance. */
export interface Guidance {
  id: string;
  /** One or two sentences, paraphrased from the bulletin in plain language. */
  text: string;
  cite: Citation;
  /** Optional tags to help the game find relevant guidance (e.g. "fence", "grounding", "bypass"). */
  tags?: string[];
}

/** Format a citation for display, e.g. "RUS Bulletin 1724E-300 §4.9, Table 4-7, p. 154". */
export function formatCitation(c: Citation, short = false): string {
  const parts: string[] = [];
  if (c.section) parts.push(`§${c.section}`);
  if (c.table) parts.push(`Table ${c.table}`);
  if (c.figure) parts.push(`Fig. ${c.figure}`);
  if (c.equation) parts.push(`Eq. ${c.equation}`);
  const p = Array.isArray(c.page) ? `pp. ${c.page[0]}–${c.page[1]}` : `p. ${c.page}`;
  parts.push(p);
  return short ? parts.join(', ') : `RUS Bulletin 1724E-300 ${parts.join(', ')}`;
}
