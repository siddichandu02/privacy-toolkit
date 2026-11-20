import { PDFDocument, degrees } from 'pdf-lib';

export type SignStage = 'reading' | 'working' | 'packing';

export interface SignProgress {
  stage: SignStage;
  /** How far through this stage, 0 to 1. */
  progress: number;
}

/**
 * Where the signature sits, as fractions of the page as it is shown (after
 * its own rotation), measured from the top left. Height follows from the
 * signature's shape, so only the width is stored.
 */
export interface Placement {
  x: number;
  y: number;
  w: number;
}

export interface SignRequest {
  name: string;
  bytes: ArrayBuffer | Uint8Array;
  /** The signature as a transparent PNG. */
  signature: ArrayBuffer | Uint8Array;
  /** Signature height divided by width. */
  aspect: number;
  place: Placement;
  /** Pages to sign, 0-based. */
  pages: readonly number[];
}

export interface SignResult {
  bytes: Uint8Array;
  name: string;
  /** Pages in the file. */
  pages: number;
  /** Pages that got the signature. */
  signed: number;
}

export class SignError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SignError';
  }
}

/** "lease.pdf" -> "lease-signed.pdf". */
export const signName = (name: string) =>
  `${name.replace(/\.pdf$/i, '').trim() || 'document'}-signed.pdf`;

export interface PageBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A page's /Rotate as 0, 90, 180 or 270. */
export const quarter = (angle: number) =>
  ((((Math.round(angle / 90) % 4) + 4) % 4) * 90) as 0 | 90 | 180 | 270;

/** Width and height of the page as a viewer shows it. */
export function shownSize(box: PageBox, rotation: number) {
  const sideways = quarter(rotation) % 180 !== 0;
  return sideways
    ? { width: box.height, height: box.width }
    : { width: box.width, height: box.height };
}

/**
 * Keep a placement on the page, with the signature at a sensible size.
 * `shownAspect` is the shown page's width divided by its height.
 */
export function clampPlacement(place: Placement, aspect: number, shownAspect: number): Placement {
  const tall = Math.max(aspect * shownAspect, 1e-6);
  const w = Math.min(1, 1 / tall, Math.max(0.05, place.w));
  // Height as a fraction of the shown page height.
  const h = w * tall;
  const x = Math.min(1 - w, Math.max(0, place.x));
  const y = Math.min(1 - h, Math.max(0, place.y));
  return { x, y, w };
}

/**
 * Turn a placement on the shown page into what pdf-lib's drawImage needs on
 * the unrotated page: the image's own bottom left corner, its size, and a
 * counter-clockwise turn that cancels the page's rotation so the signature
 * reads upright.
 */
export function toPdfSpace(box: PageBox, rotation: number, place: Placement, aspect: number) {
  const r = quarter(rotation);
  const shown = shownSize(box, r);
  const width = place.w * shown.width;
  const height = width * aspect;
  const u = place.x * shown.width;
  const v = place.y * shown.height + height; // bottom left of the signature, as shown
  const W = box.width;
  const H = box.height;
  const [px, py] =
    r === 0 ? [u, H - v] : r === 90 ? [v, u] : r === 180 ? [W - u, v] : [W - v, H - u];
  return { x: box.x + px, y: box.y + py, width, height, rotate: r };
}

/** Stamp the signature on the chosen pages. Progress ticks once per page. */
export async function signPdf(
  { name, bytes, signature, aspect, place, pages }: SignRequest,
  onProgress: (p: SignProgress) => void = () => {},
): Promise<SignResult> {
  onProgress({ stage: 'reading', progress: 0 });
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes);
    if (doc.getPageCount() === 0) throw new Error('no pages');
  } catch (err) {
    const locked = err instanceof Error && /encrypt/i.test(err.message);
    throw new SignError(
      locked
        ? `${name} is password protected. Unlock it first, then try again.`
        : `${name} could not be read. It may be damaged or not really a PDF.`,
    );
  }
  const total = doc.getPageCount();
  const targets = [...new Set(pages)].filter((i) => Number.isInteger(i) && i >= 0 && i < total);
  if (targets.length === 0) throw new SignError('Pick a page to sign.');
  if (!(aspect > 0) || !Number.isFinite(aspect)) {
    throw new SignError('The signature is empty. Draw or type it again.');
  }
  let image;
  try {
    image = await doc.embedPng(signature);
  } catch {
    throw new SignError('The signature could not be read. Draw or type it again.');
  }
  onProgress({ stage: 'reading', progress: 1 });

  onProgress({ stage: 'working', progress: 0 });
  for (const [n, i] of targets.entries()) {
    const page = doc.getPage(i);
    const box = page.getCropBox();
    const rotation = page.getRotation().angle;
    const shown = shownSize(box, rotation);
    const spot = toPdfSpace(
      box,
      rotation,
      clampPlacement(place, aspect, shown.width / shown.height),
      aspect,
    );
    page.drawImage(image, {
      x: spot.x,
      y: spot.y,
      width: spot.width,
      height: spot.height,
      rotate: degrees(spot.rotate),
    });
    onProgress({ stage: 'working', progress: (n + 1) / targets.length });
  }

  onProgress({ stage: 'packing', progress: 0 });
  const saved = await doc.save();
  onProgress({ stage: 'packing', progress: 1 });
  return { bytes: saved, name: signName(name), pages: total, signed: targets.length };
}
