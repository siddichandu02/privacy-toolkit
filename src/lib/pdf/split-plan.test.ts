import { describe, expect, it } from 'vitest';
import {
  equalParts,
  everyN,
  extendPart,
  formatRanges,
  pagesLabel,
  partOf,
  planSplit,
  togglePart,
} from './split-plan';

const r = (from: number, to = from) => ({ from, to });

describe('planSplit', () => {
  it('extract makes one file named after a single range', () => {
    expect(planSplit('Report.PDF', 'extract', [r(3)], 9).files).toEqual([
      { name: 'Report-page-3.pdf', pages: [3], label: 'page 3' },
    ]);
    expect(planSplit('a.pdf', 'extract', [r(1, 4)], 9).files[0]?.name).toBe('a-pages-1-4.pdf');
    const mixed = planSplit('a.pdf', 'extract', [r(2, 4), r(6)], 9).files;
    expect(mixed).toEqual([{ name: 'a-extract.pdf', pages: [2, 3, 4, 6], label: 'pages 2-4, 6' }]);
  });

  it('extract with nothing picked makes nothing', () => {
    expect(planSplit('a.pdf', 'extract', [], 9).files).toEqual([]);
  });

  it('parts makes a numbered file per range', () => {
    const plan = planSplit('report.pdf', 'parts', [r(1, 3), r(5, 7)], 9);
    expect(plan.zipName).toBe('report-parts.zip');
    expect(plan.files).toEqual([
      { name: 'report-part-1.pdf', pages: [1, 2, 3], label: 'pages 1-3' },
      { name: 'report-part-2.pdf', pages: [5, 6, 7], label: 'pages 5-7' },
    ]);
  });

  it('pads numbers so the zip lists in order', () => {
    const plan = planSplit('a.pdf', 'parts', everyN(12, 1), 12);
    expect(plan.files[0]?.name).toBe('a-part-01.pdf');
    expect(plan.files[11]?.name).toBe('a-part-12.pdf');
    expect(planSplit('a.pdf', 'every', [], 10).files[9]?.name).toBe('a-page-10.pdf');
  });

  it('every ignores ranges and makes a file per page', () => {
    const plan = planSplit('.pdf', 'every', [r(2)], 3);
    expect(plan.zipName).toBe('document-pages.zip');
    expect(plan.files.map((f) => f.pages)).toEqual([[1], [2], [3]]);
  });
});

describe('presets', () => {
  it('everyN chunks pages and keeps the remainder', () => {
    expect(everyN(7, 3)).toEqual([r(1, 3), r(4, 6), r(7)]);
    expect(everyN(3, 0)).toEqual([r(1), r(2), r(3)]);
  });

  it('equalParts spreads pages evenly, longer parts first', () => {
    expect(equalParts(10, 3)).toEqual([r(1, 4), r(5, 7), r(8, 10)]);
    expect(equalParts(2, 5)).toEqual([r(1), r(2)]);
  });

  it('formatRanges keeps touching ranges apart', () => {
    expect(formatRanges([r(1, 3), r(4, 6), r(7)])).toBe('1-3, 4-6, 7');
    expect(pagesLabel([5])).toBe('page 5');
  });
});

describe('grid picking', () => {
  it('a click starts a part or takes a page out of one', () => {
    expect(togglePart([], 4)).toEqual([r(4)]);
    expect(togglePart([r(1, 5)], 3)).toEqual([r(1, 2), r(4, 5)]);
    expect(togglePart([r(2)], 2)).toEqual([]);
  });

  it('shift-click grows the anchor part and clips the others', () => {
    expect(extendPart([r(2)], 2, 5)).toEqual([r(2, 5)]);
    expect(extendPart([r(1, 2), r(4, 8)], 2, 5)).toEqual([r(1, 5), r(6, 8)]);
    expect(extendPart([r(1, 2)], 6, 4)).toEqual([r(1, 2), r(4, 6)]);
    expect(partOf([r(1, 2), r(4, 6)], 5)).toBe(1);
    expect(partOf([r(1, 2)], 3)).toBe(-1);
  });
});
