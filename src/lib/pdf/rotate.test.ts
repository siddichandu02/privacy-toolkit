import { PDFDocument, degrees } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { RotateError, rotateName, rotatePdf, toDegrees, type RotateProgress } from './rotate';

/** Pages get widths 101, 102, ... so tests can tell which ones came out. */
async function makePdf(pages: number, startRotation = 0): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([101 + i, 200]).setRotation(degrees(startRotation));
  return doc.save();
}

const keep = (turns = 0) => ({ turns, keep: true });
const drop = { turns: 0, keep: false };

async function open(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((p) => ({ width: p.getWidth(), angle: p.getRotation().angle }));
}

describe('toDegrees', () => {
  it('wraps any number of turns', () => {
    expect([0, 1, 2, 3, 4, 5, -1, -2, -5].map(toDegrees)).toEqual([
      0, 90, 180, 270, 0, 90, 270, 180, 270,
    ]);
  });
});

describe('rotateName', () => {
  it('adds a suffix', () => {
    expect(rotateName('scan.PDF')).toBe('scan-rotated.pdf');
    expect(rotateName('.pdf')).toBe('document-rotated.pdf');
  });
});

describe('rotatePdf', () => {
  it('turns pages and keeps the order', async () => {
    const result = await rotatePdf({
      name: 'scan.pdf',
      bytes: await makePdf(3),
      edits: [keep(1), keep(0), keep(-1)],
    });
    expect(result).toMatchObject({ name: 'scan-rotated.pdf', pages: 3, rotated: 2, removed: 0 });
    expect(await open(result.bytes)).toEqual([
      { width: 101, angle: 90 },
      { width: 102, angle: 0 },
      { width: 103, angle: 270 },
    ]);
  });

  it('adds to the rotation a page already has', async () => {
    const result = await rotatePdf({
      name: 'a.pdf',
      bytes: await makePdf(2, 90),
      edits: [keep(1), keep(3)],
    });
    expect((await open(result.bytes)).map((p) => p.angle)).toEqual([180, 0]);
  });

  it('counts a full circle as no turn', async () => {
    const result = await rotatePdf({ name: 'a.pdf', bytes: await makePdf(1), edits: [keep(4)] });
    expect(result.rotated).toBe(0);
  });

  it('drops deleted pages', async () => {
    const result = await rotatePdf({
      name: 'a.pdf',
      bytes: await makePdf(4),
      edits: [drop, keep(2), drop, keep()],
    });
    expect(result).toMatchObject({ pages: 2, removed: 2, rotated: 1 });
    expect(await open(result.bytes)).toEqual([
      { width: 102, angle: 180 },
      { width: 104, angle: 0 },
    ]);
  });

  it('refuses to delete every page', async () => {
    await expect(
      rotatePdf({ name: 'a.pdf', bytes: await makePdf(2), edits: [drop, drop] }),
    ).rejects.toThrow(/at least one page/);
  });

  it('refuses edits that do not match the page count', async () => {
    await expect(
      rotatePdf({ name: 'a.pdf', bytes: await makePdf(2), edits: [keep()] }),
    ).rejects.toBeInstanceOf(RotateError);
  });

  it('names a file it cannot read', async () => {
    await expect(
      rotatePdf({ name: 'junk.pdf', bytes: new TextEncoder().encode('nope'), edits: [keep()] }),
    ).rejects.toThrow(/junk\.pdf could not be read/);
  });

  it('reports real progress through every stage', async () => {
    const seen: RotateProgress[] = [];
    await rotatePdf({ name: 'a.pdf', bytes: await makePdf(2), edits: [keep(1), keep()] }, (p) =>
      seen.push(p),
    );
    expect(seen.map((p) => `${p.stage}:${p.progress}`)).toEqual([
      'reading:0',
      'reading:1',
      'working:0',
      'working:0.5',
      'working:1',
      'packing:0',
      'packing:1',
    ]);
  });
});
