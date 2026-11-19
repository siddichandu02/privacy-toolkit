import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { SplitError, splitName, splitPdf, type SplitProgress } from './split';

/** Pages get widths 101, 102, ... so tests can tell which ones came out. */
async function makePdf(pages: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([101 + i, 200]);
  return doc.save();
}

const widths = (doc: PDFDocument) => doc.getPages().map((p) => p.getWidth());

describe('splitPdf', () => {
  it('extracts chosen pages into one file, in the order given', async () => {
    const result = await splitPdf({
      name: 'report.pdf',
      bytes: await makePdf(6),
      ranges: [
        { from: 5, to: 6 },
        { from: 1, to: 2 },
      ],
      mode: 'extract',
    });
    expect(result).toMatchObject({
      name: 'report-extract.pdf',
      type: 'application/pdf',
      files: 1,
      pages: 4,
    });
    expect(widths(await PDFDocument.load(result.bytes))).toEqual([105, 106, 101, 102]);
  });

  it('does not repeat pages that ranges share', async () => {
    const result = await splitPdf({
      name: 'a.pdf',
      bytes: await makePdf(4),
      ranges: [
        { from: 1, to: 3 },
        { from: 2, to: 4 },
      ],
      mode: 'extract',
    });
    expect(result.pages).toBe(4);
  });

  it('makes one PDF per range inside a zip', async () => {
    const result = await splitPdf({
      name: 'book.pdf',
      bytes: await makePdf(5),
      ranges: [
        { from: 1, to: 2 },
        { from: 4, to: 4 },
      ],
      mode: 'separate',
    });
    expect(result).toMatchObject({
      name: 'book-split.zip',
      type: 'application/zip',
      files: 2,
      pages: 3,
    });
    const zip = await JSZip.loadAsync(result.bytes);
    const names = Object.keys(zip.files).sort();
    expect(names).toEqual(['1-book-pages-1-2.pdf', '2-book-page-4.pdf']);
    const second = await zip.file('2-book-page-4.pdf')?.async('uint8array');
    expect(second).toBeDefined();
    expect(widths(await PDFDocument.load(second ?? new Uint8Array()))).toEqual([104]);
  });

  it('skips the zip when separate mode has one range', async () => {
    const result = await splitPdf({
      name: 'book.pdf',
      bytes: await makePdf(5),
      ranges: [{ from: 2, to: 3 }],
      mode: 'separate',
    });
    expect(result).toMatchObject({ name: 'book-pages-2-3.pdf', type: 'application/pdf' });
  });

  it('reports every stage and ends at packing 1', async () => {
    const events: SplitProgress[] = [];
    await splitPdf(
      {
        name: 'a.pdf',
        bytes: await makePdf(3),
        ranges: [
          { from: 1, to: 1 },
          { from: 3, to: 3 },
        ],
        mode: 'separate',
      },
      (p) => events.push(p),
    );
    expect([...new Set(events.map((e) => e.stage))]).toEqual(['reading', 'working', 'packing']);
    expect(events.filter((e) => e.stage === 'working').map((e) => e.progress)).toEqual([0, 0.5, 1]);
    expect(events.at(-1)).toEqual({ stage: 'packing', progress: 1 });
    const packing = events.filter((e) => e.stage === 'packing').map((e) => e.progress);
    expect(packing).toEqual([...packing].sort((a, b) => a - b));
  });

  it('names a file it cannot read', async () => {
    await expect(
      splitPdf({
        name: 'broken.pdf',
        bytes: new TextEncoder().encode('nope'),
        ranges: [{ from: 1, to: 1 }],
        mode: 'extract',
      }),
    ).rejects.toThrow(
      new SplitError('broken.pdf could not be read. It may be damaged or not really a PDF.'),
    );
  });

  it('refuses pages outside the document', async () => {
    await expect(
      splitPdf({
        name: 'a.pdf',
        bytes: await makePdf(2),
        ranges: [{ from: 2, to: 3 }],
        mode: 'extract',
      }),
    ).rejects.toThrow(/It has 2 pages/);
  });

  it('needs at least one range', async () => {
    await expect(
      splitPdf({ name: 'a.pdf', bytes: await makePdf(1), ranges: [], mode: 'extract' }),
    ).rejects.toThrow(SplitError);
  });
});

describe('splitName', () => {
  it('names single pages, ranges, extracts and zips', () => {
    expect(splitName('Report.PDF', [{ from: 3, to: 3 }], 'extract')).toBe('Report-page-3.pdf');
    expect(splitName('a.pdf', [{ from: 1, to: 4 }], 'extract')).toBe('a-pages-1-4.pdf');
    expect(
      splitName(
        'a.pdf',
        [
          { from: 1, to: 1 },
          { from: 3, to: 3 },
        ],
        'extract',
      ),
    ).toBe('a-extract.pdf');
    expect(
      splitName(
        '.pdf',
        [
          { from: 1, to: 1 },
          { from: 3, to: 3 },
        ],
        'separate',
      ),
    ).toBe('document-split.zip');
  });
});
