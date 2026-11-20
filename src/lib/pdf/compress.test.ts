import { PDFDict, PDFDocument, PDFName, PDFRawStream, type PDFRef } from 'pdf-lib';
import { describe, expect, it, vi } from 'vitest';
import { makeJpeg } from '../../test/make-image';
import {
  CompressError,
  compressName,
  compressPdf,
  savedPercent,
  toRgba,
  unpredictPng,
  type CompressProgress,
  type ImageRecoder,
} from './compress';

/** Random bytes that will not deflate, so the image is big enough to bother with. */
function noise(length: number) {
  const out = new Uint8Array(length);
  let seed = 7;
  for (let i = 0; i < length; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    out[i] = (seed >>> 16) & 255;
  }
  return out;
}

/** A one-page PDF with a big JPEG and a big flate RGB image drawn on it. */
async function pdfWithImages() {
  const doc = await PDFDocument.create();
  doc.setAuthor('Someone');
  doc.setTitle('Holiday');
  const page = doc.addPage([400, 400]);
  // A real JPEG header with junk after the end marker, so it is large.
  const jpeg = new Uint8Array([...makeJpeg(), ...noise(40_000)]);
  const photo = await doc.embedJpg(jpeg);
  page.drawImage(photo, { x: 0, y: 0, width: 200, height: 200 });
  const flate = doc.context.flateStream(noise(60 * 60 * 3), {
    Type: 'XObject',
    Subtype: 'Image',
    Width: 60,
    Height: 60,
    ColorSpace: 'DeviceRGB',
    BitsPerComponent: 8,
  });
  const ref = doc.context.register(flate);
  const resources = page.node.Resources() as PDFDict;
  const xobjects = resources.lookup(PDFName.of('XObject'), PDFDict);
  xobjects.set(PDFName.of('Raw1'), ref);
  // Something nothing points at.
  doc.context.register(doc.context.flateStream(noise(20_000)));
  return doc.save({ useObjectStreams: false });
}

const tinyJpeg = new Uint8Array([...makeJpeg(), 1, 2, 3]);
const shrinkAll: ImageRecoder = async (img, { maxEdge }) => ({
  bytes: tinyJpeg,
  width: Math.min(img.width, maxEdge),
  height: Math.min(img.height, maxEdge),
});

async function images(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes);
  return doc.context
    .enumerateIndirectObjects()
    .filter(
      (e): e is [PDFRef, PDFRawStream] =>
        e[1] instanceof PDFRawStream && e[1].dict.lookup(PDFName.of('Subtype')) !== undefined,
    )
    .map(([, s]) => ({
      filter: s.dict.lookup(PDFName.of('Filter'))?.toString(),
      size: s.contents.length,
    }));
}

/** Streams other than the object and xref streams pdf-lib packs things into. */
async function streamCount(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes);
  return doc.context.enumerateIndirectObjects().filter(([, o]) => {
    if (!(o instanceof PDFRawStream)) return false;
    const type = o.dict.lookup(PDFName.of('Type'))?.toString();
    return type !== '/ObjStm' && type !== '/XRef';
  }).length;
}

describe('helpers', () => {
  it('names the output', () => {
    expect(compressName('Report.PDF')).toBe('Report-compressed.pdf');
    expect(compressName('.pdf')).toBe('document-compressed.pdf');
  });

  it('works out the percent saved and never goes negative', () => {
    expect(savedPercent(1000, 250)).toBe(75);
    expect(savedPercent(1000, 1200)).toBe(0);
    expect(savedPercent(0, 0)).toBe(0);
  });

  it('undoes png row filters', () => {
    // Two rows of two gray pixels: row 1 "sub" filtered, row 2 "up" filtered.
    const data = new Uint8Array([1, 10, 5, 2, 1, 1]);
    expect([...unpredictPng(data, 2, 1)]).toEqual([10, 15, 11, 16]);
  });

  it('undoes the paeth and average filters', () => {
    const data = new Uint8Array([0, 10, 20, 3, 4, 4, 4, 1, 1]);
    const out = unpredictPng(data, 2, 1);
    expect([...out.slice(0, 2)]).toEqual([10, 20]);
    expect(out[2]).toBe((4 + (10 >> 1)) & 255);
    expect(out[3]).toBe((4 + ((9 + 20) >> 1)) & 255);
    // Row 3 paeth.
    expect(out[4]).toBe(1 + 9);
  });

  it('spreads gray and rgb samples to rgba', () => {
    expect([...toRgba(new Uint8Array([7, 9]), 2, 1)]).toEqual([7, 7, 7, 255, 9, 9, 9, 255]);
    expect([...toRgba(new Uint8Array([1, 2, 3]), 1, 3)]).toEqual([1, 2, 3, 255]);
  });
});

describe('compressPdf', () => {
  it('swaps big photos for smaller jpegs and reports real progress', async () => {
    const bytes = await pdfWithImages();
    const recode = vi.fn(shrinkAll);
    const seen: CompressProgress[] = [];
    const result = await compressPdf({ name: 'trip.pdf', bytes, level: 'balanced' }, recode, (p) =>
      seen.push(p),
    );
    expect(recode).toHaveBeenCalledTimes(2);
    expect(recode.mock.calls.map(([img]) => img.kind).sort()).toEqual(['jpeg', 'pixels']);
    expect(recode.mock.calls[0]?.[1]).toEqual({ maxEdge: 2000, quality: 0.72 });
    expect(result).toMatchObject({ name: 'trip-compressed.pdf', images: 2, shrunk: 2 });
    expect(result.smaller).toBe(true);
    expect(result.after).toBe(result.bytes.length);
    expect(result.after).toBeLessThan(result.before / 2);
    expect(seen[0]).toEqual({ stage: 'reading', progress: 0 });
    expect(seen.at(-1)).toEqual({ stage: 'packing', progress: 1 });
    expect(seen.filter((p) => p.stage === 'working').map((p) => p.progress)).toContain(0.5);

    const out = await images(result.bytes);
    expect(out.every((i) => i.filter === '/DCTDecode')).toBe(true);
    const doc = await PDFDocument.load(result.bytes);
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getTitle()).toBe('Holiday');
    expect(doc.getAuthor()).toBeUndefined();
  });

  it('passes the strong settings', async () => {
    const recode = vi.fn(shrinkAll);
    await compressPdf({ name: 'a.pdf', bytes: await pdfWithImages(), level: 'strong' }, recode);
    expect(recode.mock.calls[0]?.[1]).toEqual({ maxEdge: 1400, quality: 0.5 });
  });

  it('leaves photos alone on light but still drops unused objects', async () => {
    const bytes = await pdfWithImages();
    const recode = vi.fn(shrinkAll);
    const result = await compressPdf({ name: 'a.pdf', bytes, level: 'light' }, recode);
    expect(recode).not.toHaveBeenCalled();
    expect(result.shrunk).toBe(0);
    expect(result.smaller).toBe(true);
    expect(result.before - result.after).toBeGreaterThan(14_000);
    // Two images and the page content; the stray stream is gone.
    expect(await streamCount(bytes)).toBe(4);
    expect(await streamCount(result.bytes)).toBe(3);
  });

  it('keeps a photo when the new one would be bigger', async () => {
    const huge: ImageRecoder = async (img) => ({
      bytes: new Uint8Array(500_000),
      width: img.width,
      height: img.height,
    });
    const result = await compressPdf(
      { name: 'a.pdf', bytes: await pdfWithImages(), level: 'strong' },
      huge,
    );
    expect(result.shrunk).toBe(0);
  });

  it('survives a recoder that fails', async () => {
    const broken: ImageRecoder = () => Promise.reject(new Error('no canvas'));
    const result = await compressPdf(
      { name: 'a.pdf', bytes: await pdfWithImages(), level: 'balanced' },
      broken,
    );
    expect(result.shrunk).toBe(0);
  });

  it('hands back the original when nothing can be saved', async () => {
    const doc = await PDFDocument.create({ updateMetadata: false });
    doc.addPage();
    const bytes = await doc.save({ useObjectStreams: true });
    const result = await compressPdf({ name: 'a.pdf', bytes, level: 'strong' }, shrinkAll);
    expect(result.smaller).toBe(false);
    expect(result.after).toBe(result.before);
    expect([...result.bytes]).toEqual([...bytes]);
  });

  it('explains a file that is not a pdf', async () => {
    const bytes = new TextEncoder().encode('%PDF-1.7 nope');
    await expect(
      compressPdf({ name: 'bad.pdf', bytes, level: 'light' }, shrinkAll),
    ).rejects.toThrow(
      new CompressError('bad.pdf could not be read. It may be damaged or not really a PDF.'),
    );
  });
});
