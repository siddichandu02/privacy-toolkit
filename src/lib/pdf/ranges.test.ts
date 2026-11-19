import { describe, expect, it } from 'vitest';
import { formatPages, pagesIn, parseRanges } from './ranges';

describe('parseRanges', () => {
  it('reads single pages, closed and open ranges', () => {
    expect(parseRanges('1-3, 5, 8-', 10)).toEqual({
      ok: true,
      ranges: [
        { from: 1, to: 3 },
        { from: 5, to: 5 },
        { from: 8, to: 10 },
      ],
    });
    expect(parseRanges('-2', 4)).toEqual({ ok: true, ranges: [{ from: 1, to: 2 }] });
  });

  it('skips blanks and stray separators', () => {
    expect(parseRanges(' 2 ,, 4 - 5 ;', 6)).toEqual({
      ok: true,
      ranges: [
        { from: 2, to: 2 },
        { from: 4, to: 5 },
      ],
    });
  });

  it('accepts an en dash', () => {
    expect(parseRanges('2–3', 3)).toEqual({ ok: true, ranges: [{ from: 2, to: 3 }] });
  });

  it('asks for something when empty', () => {
    expect(parseRanges('  , ', 3)).toEqual({
      ok: false,
      error: 'Type the pages you want, like 1-3, 5.',
    });
  });

  it('rejects page 0', () => {
    expect(parseRanges('0-2', 3)).toMatchObject({ ok: false, error: 'Pages start at 1, not 0.' });
  });

  it('rejects reversed ranges with a hint', () => {
    expect(parseRanges('5-2', 6)).toMatchObject({
      ok: false,
      error: '"5-2" runs backwards. Try 2-5.',
    });
  });

  it('rejects pages past the end', () => {
    expect(parseRanges('2, 9', 3)).toMatchObject({
      ok: false,
      error: 'Page 9 is past the end. This PDF has 3 pages.',
    });
    expect(parseRanges('2', 1)).toMatchObject({ error: /This PDF has 1 page\./ });
  });

  it('rejects text and bare dashes', () => {
    expect(parseRanges('two', 3)).toMatchObject({ error: '"two" is not a page or a range.' });
    expect(parseRanges('1-2-3', 3)).toMatchObject({ ok: false });
    expect(parseRanges('-', 3)).toMatchObject({ error: /needs a page number/ });
  });
});

describe('pagesIn', () => {
  it('lists each page once, in the order first mentioned', () => {
    expect(
      pagesIn([
        { from: 4, to: 5 },
        { from: 1, to: 2 },
        { from: 2, to: 4 },
      ]),
    ).toEqual([4, 5, 1, 2, 3]);
  });
});

describe('formatPages', () => {
  it('collapses runs', () => {
    expect(formatPages([9, 1, 2, 3, 5, 8])).toBe('1-3, 5, 8-9');
    expect(formatPages([4])).toBe('4');
    expect(formatPages([])).toBe('');
  });

  it('round trips with parseRanges', () => {
    const text = formatPages([2, 3, 4, 7]);
    const parsed = parseRanges(text, 7);
    expect(parsed.ok && pagesIn(parsed.ranges)).toEqual([2, 3, 4, 7]);
  });
});
