import { describe, expect, it } from 'vitest';
import { seeded } from './sampleScene';

describe('seeded', () => {
  it('gives the same numbers for the same seed, so the sample never changes', () => {
    const a = seeded(7);
    const b = seeded(7);
    const first = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(first);
  });

  it('stays between 0 and 1', () => {
    const r = seeded(42);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
