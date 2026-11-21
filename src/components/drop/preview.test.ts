import { describe, expect, it } from 'vitest';
import { limitConcurrency } from './preview';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('limitConcurrency', () => {
  it('runs no more than the limit at once, in order', async () => {
    const run = limitConcurrency(2);
    let active = 0;
    let peak = 0;
    const started: number[] = [];
    const gates: (() => void)[] = [];
    const jobs = [0, 1, 2, 3, 4].map((n) =>
      run(async () => {
        started.push(n);
        active += 1;
        peak = Math.max(peak, active);
        await new Promise<void>((resolve) => gates.push(resolve));
        active -= 1;
        return n * 10;
      }),
    );
    await tick();
    expect(started).toEqual([0, 1]);
    while (gates.length) {
      gates.shift()?.();
      await tick();
    }
    expect(await Promise.all(jobs)).toEqual([0, 10, 20, 30, 40]);
    expect(started).toEqual([0, 1, 2, 3, 4]);
    expect(peak).toBe(2);
  });

  it('frees the slot when a task fails', async () => {
    const run = limitConcurrency(1);
    await expect(run(() => Promise.reject(new Error('bad file')))).rejects.toThrow('bad file');
    expect(await run(() => Promise.resolve('next'))).toBe('next');
  });
});
