import { describe, expect, it } from 'vitest';
import { handFamily, inkBounds, inkColor, strokeWidths, type Stroke } from './ink';

function image(width: number, height: number, inked: [number, number][]): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (const [x, y] of inked) data[(y * width + x) * 4 + 3] = 255;
  return { data, width, height, colorSpace: 'srgb' } as ImageData;
}

describe('inkBounds', () => {
  it('finds the box around the ink', () => {
    expect(
      inkBounds(
        image(10, 8, [
          [2, 3],
          [7, 5],
          [4, 1],
        ]),
      ),
    ).toEqual({ x: 2, y: 1, w: 6, h: 5 });
  });

  it('is null for an empty pad', () => {
    expect(inkBounds(image(4, 4, []))).toBeNull();
  });

  it('ignores nearly see-through pixels', () => {
    const img = image(4, 4, []);
    img.data[3] = 4;
    expect(inkBounds(img)).toBeNull();
  });
});

describe('strokeWidths', () => {
  const line = (gap: number): Stroke =>
    Array.from({ length: 12 }, (_, i) => ({ x: i * gap, y: 0, t: i * 16 }));

  it('gives one width per segment', () => {
    expect(strokeWidths(line(2), 3)).toHaveLength(11);
    expect(strokeWidths([{ x: 0, y: 0, t: 0 }], 3)).toEqual([]);
  });

  it('thins fast strokes and swells slow ones, within limits', () => {
    const slow = strokeWidths(line(0.5), 3).at(-1) ?? 0;
    const fast = strokeWidths(line(40), 3).at(-1) ?? 0;
    expect(slow).toBeGreaterThan(fast);
    expect(slow).toBeLessThanOrEqual(3 * 1.35);
    expect(fast).toBeGreaterThanOrEqual(3 * 0.55);
  });
});

describe('ink and hand lookups', () => {
  it('fall back to the first choice', () => {
    expect(inkColor('blue')).toBe('#1d46c8');
    expect(inkColor('nope' as never)).toBe('#16132b');
    expect(handFamily('casual')).toContain('Caveat');
    expect(handFamily('nope' as never)).toContain('Great Vibes');
  });
});
