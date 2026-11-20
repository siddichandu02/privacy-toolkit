import { PDFDocument } from 'pdf-lib';
import { describe, expect, it, vi } from 'vitest';
import { makeJpeg, makePng } from '../../test/make-image';
import {
  DEFAULT_OPTIONS,
  ImagesError,
  imagesPdfName,
  imagesToPdf,
  jpegOrientation,
  placeImage,
  type ImageDecoder,
  type ImagesOptions,
  type ImagesProgress,
} from './images';

const opts = (o: Partial<ImagesOptions> = {}): ImagesOptions => ({ ...DEFAULT_OPTIONS, ...o });
const noDecode: ImageDecoder = () => Promise.reject(new Error('not expected'));

async function pageSizes(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((p) => [Math.round(p.getWidth()), Math.round(p.getHeight())]);
}

describe('placeImage', () => {
  it('fits a tall image on a portrait A4 page inside the margin', () => {
    const p = placeImage(1000, 2000, opts({ margin: 'small' }));
    expect(p.pageW).toBeCloseTo(595.28);
    expect(p.pageH).toBeCloseTo(841.89);
    expect(p.h).toBeCloseTo(841.89 - 40);
    expect(p.w).toBeCloseTo(p.h / 2);
    expect(p.x).toBeCloseTo((p.pageW - p.w) / 2);
    expect(p.y).toBeCloseTo(20);
  });

  it('turns the page for wide images when orientation is auto', () => {
    const p = placeImage(3000, 2000, opts({ size: 'letter' }));
    expect([p.pageW, p.pageH]).toEqual([792, 612]);
  });

  it('keeps a fixed orientation', () => {
    const p = placeImage(
      3000,
      2000,
      opts({ size: 'letter', orientation: 'portrait', margin: 'none' }),
    );
    expect([p.pageW, p.pageH]).toEqual([612, 792]);
    expect(p.w).toBeCloseTo(612);
    expect(p.y).toBeCloseTo((792 - 408) / 2);
    const l = placeImage(100, 400, opts({ orientation: 'landscape' }));
    expect(l.pageW).toBeGreaterThan(l.pageH);
  });

  it('scales small images up to fill the space', () => {
    const p = placeImage(10, 10, opts({ margin: 'large' }));
    expect(p.w).toBeCloseTo(595.28 - 100);
  });

  it('sizes the page to the image with fit', () => {
    const p = placeImage(800, 600, opts({ size: 'fit', margin: 'small' }));
    expect(p).toEqual({ pageW: 640, pageH: 490, x: 20, y: 20, w: 600, h: 450 });
  });

  it('caps huge images at the largest page a viewer opens', () => {
    const p = placeImage(40000, 10000, opts({ size: 'fit', margin: 'none' }));
    expect(p.pageW).toBeCloseTo(14400);
    expect(p.pageH).toBeCloseTo(3600);
  });
});

describe('jpegOrientation', () => {
  it('reads the tag in both byte orders', () => {
    expect(jpegOrientation(makeJpeg(6))).toBe(6);
    expect(jpegOrientation(makeJpeg(3, true))).toBe(3);
    expect(jpegOrientation(makeJpeg(8, true))).toBe(8);
  });

  it('falls back to upright', () => {
    expect(jpegOrientation(makeJpeg())).toBe(1);
    expect(jpegOrientation(makeJpeg(42))).toBe(1);
    expect(jpegOrientation(makePng(2, 2))).toBe(1);
    expect(jpegOrientation(new Uint8Array([0xff, 0xd8, 0xff]))).toBe(1);
  });
});

describe('imagesPdfName', () => {
  it('names the file after the first image', () => {
    expect(imagesPdfName(['beach.jpg'])).toBe('beach.pdf');
    expect(imagesPdfName(['beach.jpg', 'b.png', 'c.webp'])).toBe('beach-and-2-more.pdf');
    expect(imagesPdfName(['.png'])).toBe('images.pdf');
  });
});

describe('imagesToPdf', () => {
  it('puts each image on its own page, in order', async () => {
    const progress: ImagesProgress[] = [];
    const result = await imagesToPdf(
      [
        { name: 'wide.png', type: 'image/png', bytes: makePng(40, 20) },
        { name: 'tall.png', type: 'image/png', bytes: makePng(20, 40) },
        { name: 'dot.jpg', type: 'image/jpeg', bytes: makeJpeg() },
      ],
      opts({ size: 'a4' }),
      noDecode,
      (p) => progress.push(p),
    );
    expect(result.name).toBe('wide-and-2-more.pdf');
    expect(result.pages).toBe(3);
    expect(await pageSizes(result.bytes)).toEqual([
      [842, 595],
      [595, 842],
      [595, 842],
    ]);
    expect(progress.filter((p) => p.stage === 'working').map((p) => p.progress)).toEqual([
      0,
      1 / 3,
      2 / 3,
      1,
    ]);
    expect(progress.at(-1)).toEqual({ stage: 'packing', progress: 1 });
  });

  it('sends other formats and turned photos through the decoder', async () => {
    const decode = vi.fn<ImageDecoder>(async () => ({ kind: 'png', bytes: makePng(30, 10) }));
    const result = await imagesToPdf(
      [
        { name: 'a.webp', type: 'image/webp', bytes: new Uint8Array([1, 2, 3, 4]) },
        { name: 'phone.jpg', type: 'image/jpeg', bytes: makeJpeg(6) },
      ],
      opts({ size: 'fit', margin: 'none' }),
      decode,
    );
    expect(decode).toHaveBeenCalledTimes(2);
    expect(decode.mock.calls.map((c) => c[1])).toEqual(['image/webp', 'image/jpeg']);
    expect(await pageSizes(result.bytes)).toEqual([
      [23, 8],
      [23, 8],
    ]);
  });

  it('names the image that could not be read', async () => {
    const run = imagesToPdf(
      [
        { name: 'ok.png', type: 'image/png', bytes: makePng(2, 2) },
        { name: 'broken.heic', type: 'image/heic', bytes: new Uint8Array([0, 1]) },
      ],
      opts(),
      () => Promise.reject(new Error('cannot decode')),
    );
    await expect(run).rejects.toBeInstanceOf(ImagesError);
    await expect(run).rejects.toMatchObject({
      fileName: 'broken.heic',
      message: expect.stringContaining('broken.heic could not be read'),
    });
  });

  it('needs at least one image', async () => {
    await expect(imagesToPdf([], opts(), noDecode)).rejects.toThrow('Add at least one image.');
  });
});
