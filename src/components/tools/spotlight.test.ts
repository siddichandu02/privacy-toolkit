import { describe, expect, it } from 'vitest';
import { spotFor } from './spotlight';

const box = { left: 100, top: 100, width: 200, height: 100 };

describe('spotFor', () => {
  it('places the light relative to the card', () => {
    const s = spotFor(box, 150, 120);
    expect(s.sx).toBe(50);
    expect(s.sy).toBe(20);
  });

  it('leans toward the pointer when it is on the card', () => {
    const s = spotFor(box, 290, 190);
    expect(s.pullX).toBeGreaterThan(0);
    expect(s.pullY).toBeGreaterThan(0);
    expect(Math.abs(s.pullX)).toBeLessThanOrEqual(6);
  });

  it('stays still when the pointer is far away', () => {
    expect(spotFor(box, 900, 900)).toMatchObject({ pullX: 0, pullY: 0 });
  });

  it('leans less the further away the pointer is', () => {
    const near = spotFor(box, 20, 150).pullX;
    const far = spotFor(box, -60, 150).pullX;
    expect(near).toBeLessThan(0);
    expect(Math.abs(far)).toBeLessThan(Math.abs(near));
  });
});
