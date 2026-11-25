import { afterEach, describe, expect, it, vi } from 'vitest';
import { limitConcurrency, makePreview } from './preview';

const decodeHeicOnce = vi.hoisted(() => vi.fn());
vi.mock('../../lib/image/heic', () => ({ decodeHeicOnce }));

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

describe('makePreview for photos', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows ordinary photos as they are', async () => {
    const url = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:jpg');
    const jpg = new File(['j'], 'a.jpg', { type: 'image/jpeg' });
    expect(await makePreview(jpg)).toEqual({ url: 'blob:jpg', pages: null });
    expect(url).toHaveBeenCalledWith(jpg);
  });

  it('shows a HEIC photo from its decoded copy, and nothing if it cannot be opened', async () => {
    const url = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:png');
    const png = new File(['p'], 'IMG_1.HEIC', { type: 'image/png' });
    decodeHeicOnce.mockResolvedValueOnce(png);
    expect(await makePreview(new File(['h'], 'IMG_1.HEIC'))).toEqual({
      url: 'blob:png',
      pages: null,
    });
    expect(url).toHaveBeenCalledWith(png);

    decodeHeicOnce.mockRejectedValueOnce(new Error('bad'));
    expect(await makePreview(new File(['h'], 'IMG_2.heic'))).toEqual({ url: null, pages: null });
  });
});
