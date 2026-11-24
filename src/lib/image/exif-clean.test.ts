import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { makeExifJpeg, makeExifPng } from '../../test/make-image';
import type { ImageEncoder } from './compress';
import type { ConvertSource } from './convert';
import { CLEAN_ZIP_NAME, CleanError, cleanImages } from './exif-clean';
import { readPhotoDetails } from './exif-read';

const DETAILS = { make: 'Apple', model: 'iPhone 15', gps: { lat: 51.5, lon: -0.12 } };

const src = (name: string, type: string, bytes: Uint8Array, extra = {}): ConvertSource => ({
  name,
  type,
  bytes: bytes.slice().buffer,
  ...extra,
});

const encodeAs =
  (seen: string[] = [], fail = false): ImageEncoder =>
  async (source, req) => {
    seen.push(`${source.name}:${req.type}`);
    if (fail) throw new Error('bad');
    return {
      bytes: new Uint8Array(7),
      mime: req.type,
      width: 1,
      height: 1,
      sourceWidth: 1,
      sourceHeight: 1,
    };
  };

describe('cleanImages', () => {
  it('cuts a JPEG losslessly and keeps its name', async () => {
    const seen: string[] = [];
    const jpeg = makeExifJpeg(DETAILS);
    const result = await cleanImages([src('beach.jpg', 'image/jpeg', jpeg)], encodeAs(seen));
    expect(seen).toEqual([]);
    expect(result.name).toBe('beach.jpg');
    expect(result.mime).toBe('image/jpeg');
    expect(result.items[0]).toMatchObject({ method: 'lossless', before: jpeg.length });
    expect(result.bytes.length).toBeLessThan(jpeg.length);
    expect((await readPhotoDetails(result.bytes)).location).toBeNull();
  });

  it('redraws HEIC as JPG and other formats as PNG', async () => {
    const seen: string[] = [];
    const result = await cleanImages(
      [
        src('IMG_1.HEIC', 'image/heic', new Uint8Array([1, 2, 3]), { size: 900 }),
        src('anim.gif', 'image/gif', new Uint8Array([0x47, 0x49, 0x46])),
      ],
      encodeAs(seen),
    );
    expect(seen).toEqual(['IMG_1.HEIC:image/jpeg', 'anim.gif:image/png']);
    expect(result.items.map((i) => [i.name, i.method, i.before])).toEqual([
      ['IMG_1.jpg', 'redrawn', 900],
      ['anim.png', 'redrawn', 3],
    ]);
    expect(result.name).toBe(CLEAN_ZIP_NAME);
  });

  it('zips several photos and names the ones it left out', async () => {
    const progress: string[] = [];
    const result = await cleanImages(
      [
        src('a.jpg', 'image/jpeg', makeExifJpeg(DETAILS)),
        src('a.png', 'image/png', makeExifPng(DETAILS)),
        src('broken.jpg', 'image/jpeg', new Uint8Array([9, 9, 9])),
        src('IMG_2.heic', 'image/heic', new Uint8Array([1]), { undecoded: true }),
      ],
      encodeAs([], true),
      (p) => progress.push(p.stage),
    );
    expect(result.mime).toBe('application/zip');
    expect(result.skipped.map((s) => s.name)).toEqual(['broken.jpg', 'IMG_2.heic']);
    expect(result.skipped[1]?.reason).toMatch(/HEIC/);
    const zip = await JSZip.loadAsync(result.bytes);
    expect(Object.keys(zip.files).sort()).toEqual(['a.jpg', 'a.png']);
    const png = await zip.file('a.png')?.async('uint8array');
    expect((await readPhotoDetails(png as Uint8Array)).groups).toEqual({});
    expect(progress[0]).toBe('reading');
    expect(progress.at(-1)).toBe('packing');
  });

  it('fails with the file name when the only photo cannot be opened', async () => {
    await expect(
      cleanImages([src('x.jpg', 'image/jpeg', new Uint8Array([1]))], encodeAs([], true)),
    ).rejects.toMatchObject({ name: 'CleanError', fileName: 'x.jpg' });
    await expect(cleanImages([], encodeAs())).rejects.toBeInstanceOf(CleanError);
  });
});
