/** An inclusive run of 1-based page numbers. */
export interface PageRange {
  from: number;
  to: number;
}

export type RangeParse = { ok: true; ranges: PageRange[] } | { ok: false; error: string };

const pagesWord = (n: number) => (n === 1 ? '1 page' : `${n} pages`);

/**
 * Read what someone typed, like "1-3, 5, 8-", against a document with
 * `pageCount` pages. "8-" runs to the last page and "-3" starts at page 1.
 * Empty pieces (stray commas, spaces) are skipped. Errors are written to be
 * shown as they are.
 */
export function parseRanges(text: string, pageCount: number): RangeParse {
  const parts = text
    .split(/[,;\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return { ok: false, error: 'Type the pages you want, like 1-3, 5.' };

  const ranges: PageRange[] = [];
  for (const part of parts) {
    const match = /^(\d*)\s*[-–]\s*(\d*)$/.exec(part) ?? /^(\d+)$/.exec(part);
    if (!match) return { ok: false, error: `"${part}" is not a page or a range.` };
    const single = match.length === 2;
    const fromText = match[1] ?? '';
    const toText = single ? fromText : (match[2] ?? '');
    if (!single && fromText === '' && toText === '') {
      return { ok: false, error: `"${part}" needs a page number on at least one side.` };
    }
    const from = fromText === '' ? 1 : Number(fromText);
    const to = toText === '' ? pageCount : Number(toText);
    if (from === 0 || to === 0) return { ok: false, error: 'Pages start at 1, not 0.' };
    if (from > pageCount || to > pageCount) {
      return {
        ok: false,
        error: `Page ${Math.max(from, to)} is past the end. This PDF has ${pagesWord(pageCount)}.`,
      };
    }
    if (from > to) {
      return { ok: false, error: `"${part}" runs backwards. Try ${to}-${from}.` };
    }
    ranges.push({ from, to });
  }
  return { ok: true, ranges };
}

/** Every page the ranges touch, once each, in the order first mentioned. */
export function pagesIn(ranges: readonly PageRange[]): number[] {
  const seen = new Set<number>();
  for (const { from, to } of ranges) for (let p = from; p <= to; p++) seen.add(p);
  return [...seen];
}

/**
 * The shortest text for a set of pages, e.g. [1, 2, 3, 5, 8, 9] -> "1-3, 5, 8-9".
 * Used to keep the typed ranges in step with pages picked on the grid.
 */
export function formatPages(pages: Iterable<number>): string {
  const sorted = [...new Set(pages)].filter((p) => p > 0).sort((a, b) => a - b);
  const out: string[] = [];
  let start = sorted[0];
  let prev = start;
  for (const p of [...sorted.slice(1), Infinity]) {
    if (start === undefined || prev === undefined) break;
    if (p === prev + 1) {
      prev = p;
      continue;
    }
    out.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = p;
    prev = p;
  }
  return out.join(', ');
}
