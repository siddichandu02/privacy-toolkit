import { PDFDocument, degrees } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { makePng } from '../../test/make-image';
import {
  SignError,
  clampPlacement,
  quarter,
  shownSize,
  signName,
  signPdf,
  toPdfSpace,
  type PageBox,
  type SignProgress,
} from './sign';

const LETTER: PageBox = { x: 0, y: 0, width: 612, height: 792 };

/** Where a point on the unrotated page shows up on screen, from the top left. */
function shownPoint(box: PageBox, r: number, px: number, py: number) {
  const x = px - box.x;
  const y = py - box.y;
  const { width: W, height: H } = box;
  switch (quarter(r)) {
    case 0:
      return [x, H - y];
    case 90:
      return [y, x];
    case 180:
      return [W - x, y];
    default:
      return [H - y, W - x];
  }
}

describe('toPdfSpace', () => {
  const place = { x: 0.1, y: 0.2, w: 0.3 };
  const aspect = 0.4;

  it.each([0, 90, 180, 270, -90, 450])(
    'lands the signature where it was shown on a page turned %i',
    (r) => {
      const box = { x: 10, y: 20, width: 612, height: 792 };
      const shown = shownSize(box, r);
      const spot = toPdfSpace(box, r, place, aspect);
      const w = place.w * shown.width;
      const h = w * aspect;
      expect(spot.width).toBeCloseTo(w);
      expect(spot.height).toBeCloseTo(h);
      expect(spot.rotate).toBe(quarter(r));

      // The image's own bottom left and bottom right corners, after its turn.
      const t = (spot.rotate * Math.PI) / 180;
      const bl = shownPoint(box, r, spot.x, spot.y);
      const br = shownPoint(box, r, spot.x + Math.cos(t) * w, spot.y + Math.sin(t) * w);
      const tl = shownPoint(box, r, spot.x - Math.sin(t) * h, spot.y + Math.cos(t) * h);
      const u = place.x * shown.width;
      const v = place.y * shown.height;
      expect(bl[0]).toBeCloseTo(u);
      expect(bl[1]).toBeCloseTo(v + h);
      // Reads left to right and stands upright on screen.
      expect(br[0]).toBeCloseTo(u + w);
      expect(br[1]).toBeCloseTo(v + h);
      expect(tl[0]).toBeCloseTo(u);
      expect(tl[1]).toBeCloseTo(v);
    },
  );

  it('swaps width and height for sideways pages', () => {
    expect(shownSize(LETTER, 90)).toEqual({ width: 792, height: 612 });
    expect(shownSize(LETTER, 180)).toEqual({ width: 612, height: 792 });
  });
});

describe('clampPlacement', () => {
  it('keeps the signature inside the page', () => {
    const p = clampPlacement({ x: 0.9, y: 0.95, w: 0.3 }, 0.5, 612 / 792);
    expect(p.x).toBeCloseTo(0.7);
    expect(p.y + p.w * 0.5 * (612 / 792)).toBeCloseTo(1);
    expect(clampPlacement({ x: -1, y: -1, w: 0.3 }, 0.5, 1)).toEqual({ x: 0, y: 0, w: 0.3 });
  });

  it('limits the size both ways', () => {
    expect(clampPlacement({ x: 0, y: 0, w: 0.001 }, 0.5, 1).w).toBe(0.05);
    expect(clampPlacement({ x: 0, y: 0, w: 3 }, 0.5, 1).w).toBe(1);
    // A tall signature on a wide page is limited by height.
    expect(clampPlacement({ x: 0, y: 0, w: 1 }, 2, 2).w).toBeCloseTo(0.25);
  });
});

describe('signName', () => {
  it('adds -signed', () => {
    expect(signName('lease.pdf')).toBe('lease-signed.pdf');
    expect(signName('Lease.PDF')).toBe('Lease-signed.pdf');
    expect(signName('.pdf')).toBe('document-signed.pdf');
  });
});

async function makeDoc(pages: number, rotate = 0) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([612, 792]).setRotation(degrees(rotate));
  return doc.save();
}

const sig = makePng(4, 2);

describe('signPdf', () => {
  it('stamps the chosen pages and reports real progress', async () => {
    const seen: SignProgress[] = [];
    const out = await signPdf(
      {
        name: 'lease.pdf',
        bytes: await makeDoc(3),
        signature: sig,
        aspect: 0.5,
        place: { x: 0.5, y: 0.8, w: 0.3 },
        pages: [0, 2, 2],
      },
      (p) => seen.push(p),
    );
    expect(out).toMatchObject({ name: 'lease-signed.pdf', pages: 3, signed: 2 });
    const doc = await PDFDocument.load(out.bytes);
    expect(doc.getPageCount()).toBe(3);
    const xobjects = doc.getPages().map((p) => {
      const res = p.node.Resources();
      return res?.toString().includes('XObject') ?? false;
    });
    expect(xobjects).toEqual([true, false, true]);
    expect(seen[0]).toEqual({ stage: 'reading', progress: 0 });
    expect(seen.filter((s) => s.stage === 'working').map((s) => s.progress)).toEqual([0, 0.5, 1]);
    expect(seen.at(-1)).toEqual({ stage: 'packing', progress: 1 });
  });

  it('signs rotated pages without touching their rotation', async () => {
    const out = await signPdf({
      name: 'scan.pdf',
      bytes: await makeDoc(1, 90),
      signature: sig,
      aspect: 0.5,
      place: { x: 0.1, y: 0.1, w: 0.2 },
      pages: [0],
    });
    const doc = await PDFDocument.load(out.bytes);
    expect(doc.getPage(0).getRotation().angle).toBe(90);
  });

  it('explains what went wrong', async () => {
    const base = {
      name: 'x.pdf',
      signature: sig,
      aspect: 0.5,
      place: { x: 0, y: 0, w: 0.2 },
      pages: [0],
    };
    await expect(signPdf({ ...base, bytes: new Uint8Array([1, 2, 3]) })).rejects.toThrow(
      'x.pdf could not be read',
    );
    const bytes = await makeDoc(1);
    await expect(signPdf({ ...base, bytes, pages: [5] })).rejects.toThrow('Pick a page to sign.');
    await expect(signPdf({ ...base, bytes, aspect: 0 })).rejects.toThrow('signature is empty');
    await expect(
      signPdf({ ...base, bytes, signature: new Uint8Array([9, 9]) }),
    ).rejects.toBeInstanceOf(SignError);
  });
});
