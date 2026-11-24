import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import type { EncodeRequest, ImageEncoder } from './compress';
import { resizeImages, ResizeError, RESIZE_ZIP_NAME, type ResizeSettings } from './resize';

const photo = (name: string, type = 'image/jpeg', size = 900) => ({
  name,
  type,
  bytes: new Uint8Array(400).buffer,
  size,
});

const settings: ResizeSettings = { width: 1080, height: 1350, cut: true, quality: 0.92 };

/** Pretends every photo is `w` by `h` and runs the fit the way the worker does. */
function fakeEncoder(dims: Record<string, [number, number]>, seen: unknown[] = []): ImageEncoder {
  return async (source, req: EncodeRequest) => {
    const [w, h] = dims[source.name] ?? [3000, 4000];
    if (w === 0) throw new Error('decode');
    const fitted = req.fit?.(w, h);
    seen.push({ name: source.name, type: req.type, ...fitted });
    return {
      bytes: new Uint8Array(120),
      mime: req.type,
      width: fitted?.size.width ?? w,
      height: fitted?.size.height ?? h,
      sourceWidth: w,
      sourceHeight: h,
    };
  };
}

describe('resizeImages', () => {
  it('cuts one photo, centred, and names it after the picked file', async () => {
    const seen: unknown[] = [];
    const stages: string[] = [];
    const result = await resizeImages(
      [photo('beach.HEIC', 'image/png')],
      settings,
      fakeEncoder({ 'beach.HEIC': [3000, 3000] }, seen),
      (p) => stages.push(p.stage),
    );
    expect(seen[0]).toMatchObject({
      type: 'image/jpeg',
      size: { width: 1080, height: 1350 },
      crop: { y: 0, width: 0.8, height: 1 },
    });
    expect((seen[0] as { crop: { x: number } }).crop.x).toBeCloseTo(0.1);
    expect(result).toMatchObject({
      name: 'beach-1080x1350.jpg',
      mime: 'image/jpeg',
      skipped: [],
      items: [{ width: 1080, height: 1350, sourceWidth: 3000, before: 900, after: 120 }],
    });
    expect(stages[0]).toBe('reading');
    expect(stages.at(-1)).toBe('packing');
  });

  it('uses the framing chosen for each photo', async () => {
    const seen: { crop: { x: number } }[] = [];
    await resizeImages(
      [photo('a.jpg'), photo('b.jpg')],
      { ...settings, width: 100, height: 100, views: [null, { x: 0.9, y: 0.5, zoom: 2 }] },
      fakeEncoder({ 'a.jpg': [2000, 1000], 'b.jpg': [2000, 1000] }, seen),
    );
    expect(seen[0]?.crop.x).toBeCloseTo(0.25);
    // Zoom 2 on a 2:1 photo keeps a quarter of the width; pushed right as far as it goes.
    expect(seen[1]?.crop.x).toBeCloseTo(0.75);
  });

  it('fits each whole photo inside the box without cutting', async () => {
    const result = await resizeImages(
      [photo('wide.png', 'image/png'), photo('tall.webp', 'image/webp')],
      { width: 1000, height: 1000, cut: false, quality: 0.9 },
      fakeEncoder({ 'wide.png': [4000, 2000], 'tall.webp': [1500, 3000] }),
    );
    expect(result.items.map((i) => [i.name, i.width, i.height])).toEqual([
      ['wide-1000x500.png', 1000, 500],
      ['tall-500x1000.webp', 500, 1000],
    ]);
  });

  it('puts several photos in one ZIP and names the ones it skipped', async () => {
    const result = await resizeImages(
      [photo('a.jpg'), photo('broken.jpg'), photo('a.jpeg')],
      { ...settings, width: 400, height: 400 },
      fakeEncoder({ 'broken.jpg': [0, 0] }),
    );
    expect(result.name).toBe(RESIZE_ZIP_NAME);
    expect(result.mime).toBe('application/zip');
    expect(result.skipped).toEqual([
      { name: 'broken.jpg', reason: expect.stringContaining('opened') },
    ]);
    const zip = await JSZip.loadAsync(result.bytes);
    expect(Object.keys(zip.files)).toEqual(['a-400x400.jpg', 'a-400x400 (2).jpg']);
  });

  it('leaves out HEIC photos the page could not decode', async () => {
    const result = await resizeImages(
      [photo('ok.jpg'), { ...photo('bad.heic', 'image/heic'), undecoded: true }],
      settings,
      fakeEncoder({}),
    );
    expect(result.skipped[0]).toMatchObject({
      name: 'bad.heic',
      reason: expect.stringContaining('HEIC'),
    });
  });

  it('names the file when the only photo cannot be opened', async () => {
    const err = await resizeImages(
      [photo('beach.jpg')],
      settings,
      fakeEncoder({ 'beach.jpg': [0, 0] }),
    ).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ResizeError);
    expect(err).toMatchObject({ fileName: 'beach.jpg' });
  });

  it('refuses a size of zero', async () => {
    await expect(
      resizeImages([photo('a.jpg')], { ...settings, width: 0 }, fakeEncoder({})),
    ).rejects.toThrow('at least 1 pixel');
  });
});
