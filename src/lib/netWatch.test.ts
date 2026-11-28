import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { __test, tally, toEntry, useNetEntries } from './netWatch';

const ORIGIN = 'https://example.github.io';

describe('toEntry', () => {
  it('marks files from this site as app', () => {
    const e = toEntry(
      {
        name: `${ORIGIN}/pdfpip/assets/merge.worker-abc.js`,
        startTime: 5,
        transferSize: 900,
      },
      ORIGIN,
    );
    expect(e).toMatchObject({ kind: 'app', bytes: 900, at: 5, host: 'example.github.io' });
  });

  it('marks another site as outside and never lets it count as zero', () => {
    const e = toEntry(
      { name: 'https://tracker.example.com/p.gif', startTime: 1, transferSize: 0 },
      ORIGIN,
    );
    expect(e).toMatchObject({ kind: 'outside', bytes: 1, host: 'tracker.example.com' });
  });

  it('skips local blob and data urls', () => {
    expect(toEntry({ name: `blob:${ORIGIN}/123`, startTime: 0 }, ORIGIN)).toBeNull();
    expect(toEntry({ name: 'data:image/png;base64,AAAA', startTime: 0 }, ORIGIN)).toBeNull();
  });

  it('falls back to the body size when the transfer size is hidden', () => {
    const e = toEntry(
      { name: `${ORIGIN}/a.css`, startTime: 0, transferSize: 0, encodedBodySize: 40 },
      ORIGIN,
    );
    expect(e?.bytes).toBe(40);
  });
});

describe('tally', () => {
  const entries = [
    toEntry({ name: `${ORIGIN}/a.js`, startTime: 1, transferSize: 100 }, ORIGIN),
    toEntry({ name: `${ORIGIN}/b.js`, startTime: 10, transferSize: 50 }, ORIGIN),
    toEntry({ name: 'https://x.test/1', startTime: 20, transferSize: 7 }, ORIGIN),
    toEntry({ name: 'https://x.test/2', startTime: 30, transferSize: 3 }, ORIGIN),
  ].filter((e) => e !== null);

  it('adds up app and outside requests', () => {
    expect(tally(entries)).toEqual({
      appRequests: 2,
      appBytes: 150,
      outsideRequests: 2,
      outsideBytes: 10,
      outsideHosts: ['x.test'],
    });
  });

  it('only counts requests since a moment', () => {
    expect(tally(entries, 10)).toMatchObject({ appRequests: 1, appBytes: 50, outsideRequests: 2 });
  });
});

describe('useNetEntries', () => {
  afterEach(() => __test.reset());

  it('updates when the browser logs a request', () => {
    const { result } = renderHook(() => useNetEntries());
    const before = result.current.length;
    act(() =>
      __test.record([{ name: '/pdfpip/assets/x.js', startTime: 1, transferSize: 2 }]),
    );
    expect(result.current).toHaveLength(before + 1);
    expect(result.current.at(-1)).toMatchObject({ kind: 'app', bytes: 2 });
  });
});
