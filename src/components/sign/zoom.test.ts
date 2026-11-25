import { describe, expect, it } from 'vitest';
import {
  MAX_ZOOM,
  MIN_ZOOM,
  anchorScroll,
  clampZoom,
  contentSize,
  fitZoom,
  pageOffset,
  renderWidth,
  stepZoom,
  zoomLabel,
} from './zoom';

const letter = { width: 816, height: 1056 };

describe('zoom', () => {
  it('keeps zoom in range', () => {
    expect(clampZoom(10)).toBe(MAX_ZOOM);
    expect(clampZoom(0.01)).toBe(MIN_ZOOM);
    expect(clampZoom(1.3)).toBe(1.3);
    expect(clampZoom(Number.NaN)).toBe(1);
  });

  it('steps to the next stop, even from an odd zoom', () => {
    expect(stepZoom(1, 1)).toBe(1.25);
    expect(stepZoom(1, -1)).toBe(0.75);
    expect(stepZoom(1.1, 1)).toBe(1.25);
    expect(stepZoom(1.1, -1)).toBe(1);
    expect(stepZoom(4, 1)).toBe(4);
    expect(stepZoom(0.25, -1)).toBe(0.25);
  });

  it('fits the page or its width', () => {
    const view = { width: 632, height: 632 };
    // 600 px of room for 816 px of width, 600 for 1056 of height.
    expect(fitZoom(view, letter, 'width')).toBeCloseTo(600 / 816);
    expect(fitZoom(view, letter, 'page')).toBeCloseTo(600 / 1056);
    expect(fitZoom({ width: 40, height: 40 }, letter, 'page')).toBe(MIN_ZOOM);
  });

  it('centres a small page and pads a big one', () => {
    expect(pageOffset(600, 400)).toBe(100);
    expect(pageOffset(600, 1200)).toBe(16);
    expect(contentSize(600, 400)).toBe(600);
    expect(contentSize(600, 1200)).toBe(1232);
  });

  it('keeps the point under the cursor still while zooming', () => {
    const view = 600;
    const page = 816;
    const z0 = 1;
    const z1 = 2;
    const scroll = 100;
    const anchor = 250;
    const next = anchorScroll({ scroll, anchor, view, page, z0, z1 });
    const before = (scroll + anchor - pageOffset(view, page * z0)) / z0;
    const after = (next + anchor - pageOffset(view, page * z1)) / z1;
    expect(after).toBeCloseTo(before);
  });

  it('never scrolls past the edges', () => {
    expect(anchorScroll({ scroll: 0, anchor: 0, view: 600, page: 816, z0: 2, z1: 0.5 })).toBe(0);
    const far = anchorScroll({ scroll: 5000, anchor: 600, view: 600, page: 816, z0: 4, z1: 4 });
    expect(far).toBe(contentSize(600, 816 * 4) - 600);
  });

  it('asks for drawings in steps, with a cap', () => {
    expect(renderWidth(100)).toBe(160);
    expect(renderWidth(161)).toBe(320);
    expect(renderWidth(9000)).toBe(3200);
  });

  it('labels zoom as a percentage', () => {
    expect(zoomLabel(1.25)).toBe('125%');
    expect(zoomLabel(0.667)).toBe('67%');
  });
});
