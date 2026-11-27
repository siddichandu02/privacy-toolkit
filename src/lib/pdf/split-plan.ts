import { formatPages, pagesIn, type PageRange } from './ranges';

/**
 * `extract`: the picked pages go into one new PDF.
 * `parts`: each range becomes its own PDF (zipped).
 * `every`: one PDF per page (zipped).
 */
export type SplitMode = 'extract' | 'parts' | 'every';

/** One file the split will make. Pages are 1-based, in output order. */
export interface PlannedFile {
  name: string;
  pages: number[];
  /** Short description of where its pages come from, e.g. "pages 1-3". */
  label: string;
}

export interface SplitPlan {
  files: PlannedFile[];
  /** Name of the zip when there is more than one file. */
  zipName: string;
}

export const baseName = (name: string) => name.replace(/\.pdf$/i, '').trim() || 'document';

const rangeText = ({ from, to }: PageRange) => (from === to ? `${from}` : `${from}-${to}`);

/** "pages 1-3", "page 5", "pages 2-4, 6". */
export function pagesLabel(pages: readonly number[]): string {
  const text = formatPages(pages);
  return pages.length === 1 ? `page ${text}` : `pages ${text}`;
}

/** Like formatPages, but keeps each range apart: [1-3, 4-6] -> "1-3, 4-6". */
export function formatRanges(ranges: readonly PageRange[]): string {
  return ranges.map(rangeText).join(', ');
}

const pad = (i: number, total: number) => String(i).padStart(String(total).length, '0');

/** What files a split makes, before any work is done. Empty when nothing is picked. */
export function planSplit(
  name: string,
  mode: SplitMode,
  ranges: readonly PageRange[],
  pageCount: number,
): SplitPlan {
  const base = baseName(name);
  if (mode === 'every') {
    const files = Array.from({ length: pageCount }, (_, i) => ({
      name: `${base}-page-${pad(i + 1, pageCount)}.pdf`,
      pages: [i + 1],
      label: `page ${i + 1}`,
    }));
    return { files, zipName: `${base}-pages.zip` };
  }
  if (mode === 'parts') {
    const files = ranges.map((r, i) => {
      const pages = pagesIn([r]);
      return {
        name: `${base}-part-${pad(i + 1, ranges.length)}.pdf`,
        pages,
        label: pagesLabel(pages),
      };
    });
    return { files, zipName: `${base}-parts.zip` };
  }
  const pages = pagesIn(ranges);
  if (pages.length === 0) return { files: [], zipName: `${base}-extract.zip` };
  const only = ranges.length === 1 ? ranges[0] : undefined;
  const fileName = only
    ? `${base}-${only.from === only.to ? 'page' : 'pages'}-${rangeText(only)}.pdf`
    : `${base}-extract.pdf`;
  return {
    files: [{ name: fileName, pages, label: pagesLabel(pages) }],
    zipName: `${base}-extract.zip`,
  };
}

/** Runs of `size` pages: 7 pages by 3 -> 1-3, 4-6, 7. */
export function everyN(pageCount: number, size: number): PageRange[] {
  const n = Math.max(1, Math.floor(size));
  const out: PageRange[] = [];
  for (let from = 1; from <= pageCount; from += n) {
    out.push({ from, to: Math.min(pageCount, from + n - 1) });
  }
  return out;
}

/**
 * `parts` runs as even as possible, longer ones first: 10 pages in 3 ->
 * 1-4, 5-7, 8-10. Never more parts than pages.
 */
export function equalParts(pageCount: number, parts: number): PageRange[] {
  const n = Math.min(pageCount, Math.max(1, Math.floor(parts)));
  const out: PageRange[] = [];
  const small = Math.floor(pageCount / n);
  const extra = pageCount % n;
  let from = 1;
  for (let i = 0; i < n; i++) {
    const size = small + (i < extra ? 1 : 0);
    out.push({ from, to: from + size - 1 });
    from += size;
  }
  return out;
}

/** Index of the first range holding `page`, or -1. */
export function partOf(ranges: readonly PageRange[], page: number): number {
  return ranges.findIndex((r) => page >= r.from && page <= r.to);
}

/** Take one page out of a range, splitting it in two when the page is inside. */
function without(r: PageRange, page: number): PageRange[] {
  if (page < r.from || page > r.to) return [r];
  const out: PageRange[] = [];
  if (r.from < page) out.push({ from: r.from, to: page - 1 });
  if (page < r.to) out.push({ from: page + 1, to: r.to });
  return out;
}

/**
 * A click on the page grid in "parts": a page already in a part leaves it,
 * any other page starts a new part of its own.
 */
export function togglePart(ranges: readonly PageRange[], page: number): PageRange[] {
  if (partOf(ranges, page) === -1) return [...ranges, { from: page, to: page }];
  return ranges.flatMap((r) => without(r, page));
}

/**
 * A shift-click: the pages from `anchor` to `page` join the part that holds
 * `anchor` (or become a new part), and leave any other part.
 */
export function extendPart(
  ranges: readonly PageRange[],
  anchor: number,
  page: number,
): PageRange[] {
  const lo = Math.min(anchor, page);
  const hi = Math.max(anchor, page);
  const home = partOf(ranges, anchor);
  const out: PageRange[] = [];
  ranges.forEach((r, i) => {
    if (i === home) {
      out.push({ from: Math.min(r.from, lo), to: Math.max(r.to, hi) });
      return;
    }
    // Clip the span out of every other part.
    if (r.to < lo || r.from > hi) out.push(r);
    else {
      if (r.from < lo) out.push({ from: r.from, to: lo - 1 });
      if (r.to > hi) out.push({ from: hi + 1, to: r.to });
    }
  });
  if (home === -1) out.push({ from: lo, to: hi });
  return out;
}

/**
 * Plain tick on / tick off for a set of pages; Shift fills the run from the
 * last page touched with that page's state.
 */
export function toggleSelection(
  selected: ReadonlySet<number>,
  page: number,
  from: number | null,
): Set<number> {
  const next = new Set(selected);
  if (from !== null) {
    const on = selected.has(from);
    const [lo, hi] = from < page ? [from, page] : [page, from];
    for (let p = lo; p <= hi; p++) {
      if (on) next.add(p);
      else next.delete(p);
    }
  } else if (next.has(page)) {
    next.delete(page);
  } else {
    next.add(page);
  }
  return next;
}
