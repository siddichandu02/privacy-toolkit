import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { SplitError, splitPdf, type SplitProgress } from './split';
import { planSplit } from './split-plan';

/** Pages get widths 101, 102, ... so tests can tell which ones came out. */
async function makePdf(pages: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([101 + i, 200]);
  return doc.save();
}

const widths = (doc: PDFDocument) => doc.getPages().map((p) => p.getWidth());

describe('splitPdf', () => {
  it('extracts chosen pages into one file, in the order given', async () => {
    const plan = planSplit(
      'report.pdf',
      'extract',
      [
        { from: 5, to: 6 },
        { from: 1, to: 2 },
      ],
      6,
    );
    const result = await splitPdf({ name: 'report.pdf', bytes: await makePdf(6), ...plan });
    expect(result).toMatchObject({
      name: 'report-extract.pdf',
      type: 'application/pdf',
      files: 1,
      pages: 4,
    });
    expect(widths(await PDFDocument.load(result.bytes))).toEqual([105, 106, 101, 102]);
  });

  it('makes one PDF per part inside a zip', async () => {
    const plan = planSplit(
      'book.pdf',
      'parts',
      [
        { from: 1, to: 2 },
        { from: 4, to: 4 },
      ],
      5,
    );
    const result = await splitPdf({ name: 'book.pdf', bytes: await makePdf(5), ...plan });
    expect(result).toMatchObject({
      name: 'book-parts.zip',
      type: 'application/zip',
      files: 2,
      pages: 3,
    });
    const zip = await JSZip.loadAsync(result.bytes);
    expect(Object.keys(zip.files).sort()).toEqual(['book-part-1.pdf', 'book-part-2.pdf']);
    const second = await zip.file('book-part-2.pdf')?.async('uint8array');
    expect(widths(await PDFDocument.load(second ?? new Uint8Array()))).toEqual([104]);
  });

  it('makes one PDF per page', async () => {
    const plan = planSplit('a.pdf', 'every', [], 3);
    const result = await splitPdf({ name: 'a.pdf', bytes: await makePdf(3), ...plan });
    expect(result).toMatchObject({ name: 'a-pages.zip', files: 3, pages: 3 });
    const zip = await JSZip.loadAsync(result.bytes);
    expect(Object.keys(zip.files).sort()).toEqual(['a-page-1.pdf', 'a-page-2.pdf', 'a-page-3.pdf']);
  });

  it('skips the zip when there is one file', async () => {
    const plan = planSplit('book.pdf', 'parts', [{ from: 2, to: 3 }], 5);
    const result = await splitPdf({ name: 'book.pdf', bytes: await makePdf(5), ...plan });
    expect(result).toMatchObject({ name: 'book-part-1.pdf', type: 'application/pdf' });
  });

  it('reports every stage and ends at packing 1', async () => {
    const events: SplitProgress[] = [];
    await splitPdf(
      {
        name: 'a.pdf',
        bytes: await makePdf(3),
        files: [
          { name: 'x.pdf', pages: [1] },
          { name: 'y.pdf', pages: [3] },
        ],
        zipName: 'a.zip',
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
        files: [{ name: 'x.pdf', pages: [1] }],
        zipName: 'x.zip',
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
        files: [{ name: 'x.pdf', pages: [2, 3] }],
        zipName: 'x.zip',
      }),
    ).rejects.toThrow(/It has 2 pages/);
  });

  it('needs at least one page', async () => {
    await expect(
      splitPdf({ name: 'a.pdf', bytes: await makePdf(1), files: [], zipName: 'x.zip' }),
    ).rejects.toThrow(SplitError);
    await expect(
      splitPdf({
        name: 'a.pdf',
        bytes: await makePdf(1),
        files: [{ name: 'x.pdf', pages: [] }],
        zipName: 'x.zip',
      }),
    ).rejects.toThrow(SplitError);
  });
});
