import { describe, expect, it } from 'vitest';
import {
  CENTERED,
  clampView,
  cropBox,
  enlargement,
  getPreset,
  fitInside,
  heightFor,
  parseSide,
  PRESETS,
  ratioLabel,
  resizedName,
  resizeOutputType,
  widthFor,
} from './resize-names';

const close = (box: { x: number; y: number; width: number; height: number }) => ({
  x: +box.x.toFixed(4),
  y: +box.y.toFixed(4),
  width: +box.width.toFixed(4),
  height: +box.height.toFixed(4),
});

describe('presets', () => {
  it('have unique ids and sane sizes', () => {
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length);
    for (const p of PRESETS) {
      expect(p.width).toBeGreaterThan(0);
      expect(p.height).toBeGreaterThan(0);
    }
    expect(getPreset('passport')).toMatchObject({ width: 413, height: 531 });
    expect(getPreset('nope')).toBeUndefined();
  });
});

describe('cropBox', () => {
  it('keeps the full height of a wide photo in a square frame, centred', () => {
    expect(close(cropBox(4000, 2000, 1, CENTERED))).toEqual({
      x: 0.25,
      y: 0,
      width: 0.5,
      height: 1,
    });
  });

  it('keeps the full width of a tall photo in a wide frame', () => {
    expect(close(cropBox(1000, 2000, 2, CENTERED))).toEqual({
      x: 0,
      y: 0.375,
      width: 1,
      height: 0.25,
    });
  });

  it('keeps the whole photo when the shapes match', () => {
    expect(close(cropBox(1600, 900, 16 / 9, CENTERED))).toEqual({
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
  });

  it('shrinks the area as you zoom in', () => {
    const box = cropBox(1000, 1000, 1, { x: 0.5, y: 0.5, zoom: 2 });
    expect(close(box)).toEqual({ x: 0.25, y: 0.25, width: 0.5, height: 0.5 });
  });

  it('never lets the area leave the photo', () => {
    const box = cropBox(1000, 1000, 1, { x: 0, y: 1, zoom: 2 });
    expect(close(box)).toEqual({ x: 0, y: 0.5, width: 0.5, height: 0.5 });
  });
});

describe('clampView', () => {
  it('limits zoom and repairs bad numbers', () => {
    expect(clampView(100, 100, 1, { x: Number.NaN, y: 0.5, zoom: 99 })).toEqual({
      x: 0.5,
      y: 0.5,
      zoom: 5,
    });
    expect(clampView(100, 100, 1, { x: 0.2, y: 0.5, zoom: 0.1 })).toEqual({
      x: 0.5,
      y: 0.5,
      zoom: 1,
    });
  });
});

describe('sizes', () => {
  it('keeps the shape', () => {
    expect(heightFor(4000, 3000, 1200)).toBe(900);
    expect(widthFor(4000, 3000, 900)).toBe(1200);
    expect(heightFor(4000, 1, 10)).toBe(1);
  });

  it('parses whole pixel counts only', () => {
    expect(parseSide('1080')).toBe(1080);
    expect(parseSide(' 42 ')).toBe(42);
    expect(parseSide('0')).toBeNull();
    expect(parseSide('12.5')).toBeNull();
    expect(parseSide('9000')).toBeNull();
    expect(parseSide('')).toBeNull();
  });

  it('tells when the kept area gets enlarged', () => {
    const box = { x: 0, y: 0, width: 0.5, height: 1 };
    expect(enlargement(1000, 500, box, 250, 250)).toBe(0.5);
    expect(enlargement(1000, 500, box, 1000, 1000)).toBe(2);
  });

  it('labels ratios plainly', () => {
    expect(ratioLabel(1080, 1350)).toBe('4:5');
    expect(ratioLabel(1280, 720)).toBe('16:9');
    expect(ratioLabel(1584, 396)).toBe('4:1');
    expect(ratioLabel(413, 531)).toBe('7:9');
    expect(ratioLabel(1001, 500)).toBe('2.00:1');
  });
});

describe('names and types', () => {
  it('puts the size in the name', () => {
    expect(resizedName('beach.HEIC', 1080, 1350, 'image/jpeg')).toBe('beach-1080x1350.jpg');
    expect(resizedName('.png', 10, 10, 'image/png')).toBe('photo-10x10.png');
  });

  it('picks a sensible output type', () => {
    expect(resizeOutputType({ name: 'a.jpg', type: 'image/jpeg' })).toBe('image/jpeg');
    expect(resizeOutputType({ name: 'IMG_1.HEIC', type: '' })).toBe('image/jpeg');
    expect(resizeOutputType({ name: 'a.webp', type: 'image/webp' })).toBe('image/webp');
    expect(resizeOutputType({ name: 'a.png', type: 'image/png' })).toBe('image/png');
    expect(resizeOutputType({ name: 'a.gif', type: 'image/gif' })).toBe('image/png');
  });
});

describe('fitInside', () => {
  it('keeps the shape and touches the box on one side', () => {
    expect(fitInside(4000, 2000, 1000, 1000)).toEqual({ width: 1000, height: 500 });
    expect(fitInside(1500, 3000, 1000, 1000)).toEqual({ width: 500, height: 1000 });
  });

  it('gives the box itself when the height already follows the shape', () => {
    expect(fitInside(3024, 4032, 1200, 1600)).toEqual({ width: 1200, height: 1600 });
    expect(fitInside(4000, 3001, 1000, 750)).toEqual({ width: 1000, height: 750 });
  });
});
