import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import {
  compressImages,
  compressedImageName,
  fitEdge,
  ignoresQuality,
  outputType,
  uniqueNames,
  ZIP_NAME,
  type ImageEncoder,
  type SourceImage,
} from './compress';

const src = (name: string, type: string, size: number): SourceImage => ({
  name,
  type,
  bytes: new Uint8Array(size).fill(7).buffer,
});

/** Pretend encoder: output size is the input size times the quality. */
const fakeEncode =
  (opts: { fail?: string[]; width?: number; actualType?: string } = {}): ImageEncoder =>
  async (source, req) => {
    if (opts.fail?.includes(source.name)) throw new Error('bad');
    const size = Math.round(source.bytes.byteLength * req.quality);
    const full = opts.width ?? 1000;
    const width = req.maxEdge ? Math.min(full, req.maxEdge) : full;
    return {
      bytes: new Uint8Array(size),
      mime: opts.actualType ?? req.type,
      width,
      height: Math.round(width * 0.75),
      sourceWidth: full,
      sourceHeight: Math.round(full * 0.75),
    };
  };

const settings = { quality: 0.5, format: 'same' as const, maxEdge: null };

describe('names and types', () => {
  it('keeps the type unless asked, and turns GIF into PNG', () => {
    expect(outputType('image/jpeg', 'same')).toBe('image/jpeg');
    expect(outputType('image/png', 'same')).toBe('image/png');
    expect(outputType('image/gif', 'same')).toBe('image/png');
    expect(outputType('image/png', 'webp')).toBe('image/webp');
    expect(outputType('image/webp', 'jpeg')).toBe('image/jpeg');
    expect(ignoresQuality('image/png')).toBe(true);
    expect(ignoresQuality('image/jpeg')).toBe(false);
  });

  it('names the copy after the original with the new extension', () => {
    expect(compressedImageName('beach.png', 'image/webp')).toBe('beach-compressed.webp');
    expect(compressedImageName('IMG_01.JPEG', 'image/jpeg')).toBe('IMG_01-compressed.jpg');
    expect(compressedImageName('.png', 'image/png')).toBe('photo-compressed.png');
  });

  it('fits the long side without upscaling', () => {
    expect(fitEdge(4000, 3000, 1920)).toEqual({ width: 1920, height: 1440 });
    expect(fitEdge(3000, 4000, 1920)).toEqual({ width: 1440, height: 1920 });
    expect(fitEdge(800, 600, 1920)).toEqual({ width: 800, height: 600 });
    expect(fitEdge(800, 600, null)).toEqual({ width: 800, height: 600 });
  });

  it('numbers repeated names', () => {
    expect(uniqueNames(['a.jpg', 'b.jpg', 'A.jpg', 'a.jpg', 'c'])).toEqual([
      'a.jpg',
      'b.jpg',
      'A (2).jpg',
      'a (3).jpg',
      'c',
    ]);
  });
});

describe('compressImages', () => {
  it('returns one photo as it is, with real sizes and stages', async () => {
    const stages: string[] = [];
    const out = await compressImages(
      [src('cat.jpg', 'image/jpeg', 1000)],
      settings,
      fakeEncode(),
      (p) => stages.push(p.stage),
    );
    expect(out.name).toBe('cat-compressed.jpg');
    expect(out.mime).toBe('image/jpeg');
    expect(out.bytes.byteLength).toBe(500);
    expect(out).toMatchObject({ before: 1000, after: 500, skipped: [] });
    expect([...new Set(stages)]).toEqual(['reading', 'working', 'packing']);
  });

  it('keeps the original when the copy would be bigger', async () => {
    const out = await compressImages(
      [src('tiny.jpg', 'image/jpeg', 100)],
      { ...settings, quality: 0.95 },
      async (s, req) => ({ ...(await fakeEncode()(s, req)), bytes: new Uint8Array(150) }),
    );
    expect(out.items[0]).toMatchObject({ name: 'tiny.jpg', kept: true, after: 100 });
    expect(out.bytes.byteLength).toBe(100);
  });

  it('uses the copy when it was resized, even if it is not smaller', async () => {
    const out = await compressImages(
      [src('big.jpg', 'image/jpeg', 100)],
      { ...settings, maxEdge: 500 },
      async (s, req) => ({ ...(await fakeEncode()(s, req)), bytes: new Uint8Array(120) }),
    );
    expect(out.items[0]).toMatchObject({ kept: false, after: 120 });
  });

  it('names the file after what the browser really wrote', async () => {
    const out = await compressImages(
      [src('a.png', 'image/png', 1000)],
      { ...settings, format: 'webp' },
      fakeEncode({ actualType: 'image/png' }),
    );
    expect(out.name).toBe('a-compressed.png');
  });

  it('zips several photos, skipping and naming the ones it cannot open', async () => {
    const out = await compressImages(
      [
        src('a.jpg', 'image/jpeg', 1000),
        src('a.jpg', 'image/jpeg', 800),
        src('phone.heic', 'image/heic', 900),
      ],
      settings,
      fakeEncode({ fail: ['phone.heic'] }),
    );
    expect(out.name).toBe(ZIP_NAME);
    expect(out.mime).toBe('application/zip');
    expect(out.skipped).toEqual([{ name: 'phone.heic', reason: expect.stringMatching(/HEIC/) }]);
    expect(out).toMatchObject({ before: 1800, after: 900 });
    const zip = await JSZip.loadAsync(out.bytes);
    expect(Object.keys(zip.files).sort()).toEqual(['a-compressed (2).jpg', 'a-compressed.jpg']);
  });

  it('fails with a plain message when nothing could be opened', async () => {
    await expect(
      compressImages([src('x.jpg', 'image/jpeg', 10)], settings, fakeEncode({ fail: ['x.jpg'] })),
    ).rejects.toThrow(/x\.jpg could not be compressed/);
    await expect(
      compressImages(
        [src('x.jpg', 'image/jpeg', 10), src('y.jpg', 'image/jpeg', 10)],
        settings,
        fakeEncode({ fail: ['x.jpg', 'y.jpg'] }),
      ),
    ).rejects.toThrow(/None of these photos/);
  });
});
