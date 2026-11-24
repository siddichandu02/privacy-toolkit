import { describe, expect, it, vi } from 'vitest';
import { decodeHeicOnce, prepareImages } from './heic';

describe('decodeHeicOnce', () => {
  it('decodes each picked file once and forgets failures', async () => {
    const file = new File(['h'], 'IMG.HEIC');
    const png = new File(['p'], 'IMG.HEIC', { type: 'image/png' });
    const decode = vi.fn(async () => png);
    expect(await decodeHeicOnce(file, decode)).toBe(png);
    expect(await decodeHeicOnce(file, decode)).toBe(png);
    expect(decode).toHaveBeenCalledOnce();

    const other = new File(['h'], 'B.HEIC');
    const failing = vi.fn(async () => {
      throw new Error('bad');
    });
    await expect(decodeHeicOnce(other, failing)).rejects.toThrow('bad');
    await Promise.resolve();
    await expect(decodeHeicOnce(other, async () => png)).resolves.toBe(png);
  });
});

describe('prepareImages', () => {
  it('swaps HEIC photos for decoded copies and keeps the rest', async () => {
    const jpg = new File(['j'], 'a.jpg', { type: 'image/jpeg' });
    const heic = new File(['hh'], 'b.heic');
    const png = new File(['p'], 'b.heic', { type: 'image/png' });
    const shares: number[] = [];
    const out = await prepareImages(
      [jpg, heic],
      (s) => shares.push(s),
      async () => png,
    );
    expect(out).toEqual({ files: [jpg, png], sizes: [1, 2], undecoded: [] });
    expect(shares).toEqual([1]);
  });
});
