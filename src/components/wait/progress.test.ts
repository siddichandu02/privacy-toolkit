import { DEFAULT_STEPS, overallProgress } from './progress';

describe('overallProgress', () => {
  it('gives each step an equal slice', () => {
    expect(overallProgress(DEFAULT_STEPS, 'reading', 0)).toBe(0);
    expect(overallProgress(DEFAULT_STEPS, 'reading', 0.5)).toBeCloseTo(1 / 6);
    expect(overallProgress(DEFAULT_STEPS, 'working', 0)).toBeCloseTo(1 / 3);
    expect(overallProgress(DEFAULT_STEPS, 'packing', 1)).toBe(1);
  });

  it('clamps progress inside a step', () => {
    expect(overallProgress(DEFAULT_STEPS, 'working', 4)).toBeCloseTo(2 / 3);
    expect(overallProgress(DEFAULT_STEPS, 'working', -1)).toBeCloseTo(1 / 3);
    expect(overallProgress(DEFAULT_STEPS, 'working', Number.NaN)).toBeCloseTo(1 / 3);
  });

  it('treats unknown steps and empty lists as the start', () => {
    expect(overallProgress(DEFAULT_STEPS, 'nope', 0.5)).toBe(0);
    expect(overallProgress([], 'reading', 0.5)).toBe(0);
  });
});
