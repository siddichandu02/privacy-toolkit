import { PDFDocument, StandardFonts } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { MergeError, mergePdfs, mergedName, type MergeProgress } from './merge';

async function makePdf(pages: number, width = 612): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages; i++) {
    const page = doc.addPage([width, 792]);
    page.drawText(`Page ${i + 1}`, { x: 72, y: 700, size: 24, font });
  }
  return doc.save();
}

describe('mergePdfs', () => {
  it('keeps every page in order', async () => {
    const a = await makePdf(2, 300);
    const b = await makePdf(3, 500);
    const result = await PDFDocument.load(
      await mergePdfs([
        { name: 'a.pdf', bytes: a },
        { name: 'b.pdf', bytes: b },
      ]),
    );
    expect(result.getPageCount()).toBe(5);
    const widths = result.getPages().map((p) => p.getWidth());
    expect(widths).toEqual([300, 300, 500, 500, 500]);
  });

  it('reports stages in order and ends at packing 1', async () => {
    const events: MergeProgress[] = [];
    await mergePdfs(
      [
        { name: 'a.pdf', bytes: await makePdf(1) },
        { name: 'b.pdf', bytes: await makePdf(1) },
      ],
      (p) => events.push(p),
    );
    const stages = [...new Set(events.map((e) => e.stage))];
    expect(stages).toEqual(['reading', 'working', 'packing']);
    expect(events.filter((e) => e.stage === 'reading').map((e) => e.progress)).toEqual([0, 0.5, 1]);
    expect(events.at(-1)).toEqual({ stage: 'packing', progress: 1 });
  });

  it('names the file it could not read', async () => {
    const bad = new TextEncoder().encode('not a pdf at all');
    await expect(
      mergePdfs([
        { name: 'good.pdf', bytes: await makePdf(1) },
        { name: 'broken.pdf', bytes: bad },
      ]),
    ).rejects.toMatchObject({ name: 'MergeError', fileName: 'broken.pdf' });
  });

  it('refuses an empty list', async () => {
    await expect(mergePdfs([])).rejects.toBeInstanceOf(MergeError);
  });
});

describe('mergedName', () => {
  it('adds a suffix to the first file name', () => {
    expect(mergedName('Report.PDF')).toBe('Report-merged.pdf');
    expect(mergedName('')).toBe('merged.pdf');
    expect(mergedName()).toBe('merged.pdf');
  });
});
