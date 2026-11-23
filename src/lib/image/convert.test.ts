import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import type { ImageEncoder } from './compress';
import {
  CONVERT_ZIP_NAME,
  convertImages,
  convertedName,
  formatLabel,
  formatMix,
  isHeic,
  targetLabel,
  type ConvertSource,
} from './convert';
import { prepareImages } from './heic';

const src = (name: string, type: string, size: number, extra = {}): ConvertSource => ({
  name,
  type,
  bytes: new Uint8Array(size).fill(3).buffer,
  ...extra,
});

const fakeEncode =
  (opts: { fail?: string[]; actualType?: string } = {}): ImageEncoder =>
  async (source, req) => {
    if (opts.fail?.includes(source.name)) throw new Error('bad');
    return {
      bytes: new Uint8Array(Math.round(source.bytes.byteLength / 2)),
      mime: opts.actualType ?? req.type,
      width: 10,
      height: 8,
      sourceWidth: 10,
      sourceHeight: 8,
    };
  };

describe('names and labels', () => {
  it('swaps the extension and nothing else', () => {
    expect(convertedName('IMG_0042.HEIC', 'image/jpeg')).toBe('IMG_0042.jpg');
    expect(convertedName('logo.png', 'image/webp')).toBe('logo.webp');
    expect(convertedName('no-dot', 'image/png')).toBe('no-dot.png');
    expect(convertedName('.webp', 'image/png')).toBe('photo.png');
  });

  it('spots HEIC by name or type', () => {
    expect(isHeic({ name: 'a.heic', type: '' })).toBe(true);
    expect(isHeic({ name: 'a.HEIF', type: '' })).toBe(true);
    expect(isHeic({ name: 'a', type: 'image/heic' })).toBe(true);
    expect(isHeic({ name: 'heic.jpg', type: 'image/jpeg' })).toBe(false);
  });

  it('names formats the way people say them', () => {
    expect(formatLabel({ name: 'a.jpeg', type: '' })).toBe('JPG');
    expect(formatLabel({ name: 'a', type: 'image/webp' })).toBe('WebP');
    expect(formatLabel({ name: 'a.heic', type: '' })).toBe('HEIC');
    expect(formatLabel({ name: 'a.gif', type: 'image/gif' })).toBe('GIF');
    expect(formatLabel({ name: 'a.xyz', type: '' })).toBe('Image');
    expect(targetLabel('jpeg')).toBe('JPG');
    expect(targetLabel('webp')).toBe('WebP');
  });

  it('sums up a mixed pile, biggest group first', () => {
    const pile = [
      { name: 'a.png', type: 'image/png' },
      { name: 'b.heic', type: '' },
      { name: 'c.HEIC', type: '' },
    ];
    expect(formatMix(pile)).toBe('2 HEIC, 1 PNG');
  });
});

describe('convertImages', () => {
  it('converts one photo and reports the original size', async () => {
    const stages: string[] = [];
    const out = await convertImages(
      [src('IMG_1.heic', 'image/png', 800, { size: 300 })],
      { to: 'jpeg', quality: 0.9 },
      fakeEncode(),
      (p) => stages.push(p.stage),
    );
    expect(out.name).toBe('IMG_1.jpg');
    expect(out.mime).toBe('image/jpeg');
    expect(out.items).toEqual([
      { name: 'IMG_1.jpg', from: 'image/png', type: 'image/jpeg', before: 300, after: 400 },
    ]);
    expect(out.fellBack).toBe(false);
    expect(stages[0]).toBe('reading');
    expect(stages.at(-1)).toBe('packing');
  });

  it('zips several photos with unique names', async () => {
    const out = await convertImages(
      [src('a.png', 'image/png', 100), src('a.jpg', 'image/jpeg', 100)],
      { to: 'webp', quality: 0.8 },
      fakeEncode(),
    );
    expect(out.name).toBe(CONVERT_ZIP_NAME);
    expect(out.mime).toBe('application/zip');
    const zip = await JSZip.loadAsync(out.bytes);
    expect(Object.keys(zip.files).sort()).toEqual(['a (2).webp', 'a.webp']);
  });

  it('skips broken and undecoded photos but keeps going', async () => {
    const out = await convertImages(
      [
        src('good.png', 'image/png', 100),
        src('bad.png', 'image/png', 100),
        src('odd.heic', '', 100, { undecoded: true }),
      ],
      { to: 'jpeg', quality: 0.9 },
      fakeEncode({ fail: ['bad.png'] }),
    );
    expect(out.items.map((i) => i.name)).toEqual(['good.jpg']);
    expect(out.skipped.map((s) => s.name)).toEqual(['bad.png', 'odd.heic']);
    expect(out.skipped[1]?.reason).toMatch(/HEIC photo could not be read/);
  });

  it('notices when the browser saved PNG instead', async () => {
    const out = await convertImages(
      [src('a.jpg', 'image/jpeg', 100)],
      { to: 'webp', quality: 0.8 },
      fakeEncode({ actualType: 'image/png' }),
    );
    expect(out.fellBack).toBe(true);
    expect(out.name).toBe('a.png');
  });

  it('names the file when the only photo fails', async () => {
    await expect(
      convertImages(
        [src('bad.png', 'image/png', 10)],
        { to: 'png', quality: 1 },
        fakeEncode({ fail: ['bad.png'] }),
      ),
    ).rejects.toMatchObject({
      fileName: 'bad.png',
      message: expect.stringMatching(/bad.png could not be converted/),
    });
    await expect(convertImages([], { to: 'png', quality: 1 }, fakeEncode())).rejects.toThrow(
      /at least one/,
    );
  });
});

describe('prepareImages', () => {
  const file = (name: string, type = '') => new File([new Uint8Array(5)], name, { type });

  it('decodes only HEIC photos, keeps order, and counts progress over them', async () => {
    const shares: number[] = [];
    const decode = async (f: File) => new File(['png!'], f.name, { type: 'image/png' });
    const out = await prepareImages(
      [file('a.jpg', 'image/jpeg'), file('b.heic'), file('c.HEIC')],
      (s) => shares.push(s),
      decode,
    );
    expect(out.files.map((f) => [f.name, f.type])).toEqual([
      ['a.jpg', 'image/jpeg'],
      ['b.heic', 'image/png'],
      ['c.HEIC', 'image/png'],
    ]);
    expect(out.sizes).toEqual([5, 5, 5]);
    expect(shares).toEqual([0.5, 1]);
    expect(out.undecoded).toEqual([]);
  });

  it('leaves a HEIC that fails to decode as it was and names it', async () => {
    const out = await prepareImages([file('x.heic')], undefined, async () => {
      throw new Error('nope');
    });
    expect(out.files[0]?.type).toBe('');
    expect(out.undecoded).toEqual(['x.heic']);
  });
});
