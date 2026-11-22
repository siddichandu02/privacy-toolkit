import { PDFDocument, degrees } from 'pdf-lib';
import { rotateName } from './file-names';
import { toDegrees, type PageEdit } from './page-edits';

export { rotateName } from './file-names';
export { NO_EDIT, toDegrees } from './page-edits';
export type { PageEdit } from './page-edits';

export type RotateStage = 'reading' | 'working' | 'packing';

export interface RotateProgress {
  stage: RotateStage;
  /** How far through this stage, 0 to 1. */
  progress: number;
}

export interface RotateRequest {
  name: string;
  bytes: ArrayBuffer | Uint8Array;
  /** One entry per page, in page order. */
  edits: readonly PageEdit[];
}

export interface RotateResult {
  bytes: Uint8Array;
  name: string;
  /** Pages in the new file. */
  pages: number;
  /** Pages that were turned. */
  rotated: number;
  /** Pages that were dropped. */
  removed: number;
}

export class RotateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RotateError';
  }
}

/**
 * Turn and drop pages. The turn is added to whatever rotation a page already
 * has, so a page that was scanned sideways and saved with /Rotate 90 ends up
 * where the thumbnail showed it. Progress is real: one tick per page.
 */
export async function rotatePdf(
  { name, bytes, edits }: RotateRequest,
  onProgress: (p: RotateProgress) => void = () => {},
): Promise<RotateResult> {
  onProgress({ stage: 'reading', progress: 0 });
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes);
    if (doc.getPageCount() === 0) throw new Error('no pages');
  } catch (err) {
    const locked = err instanceof Error && /encrypt/i.test(err.message);
    throw new RotateError(
      locked
        ? `${name} is password protected. Unlock it first, then try again.`
        : `${name} could not be read. It may be damaged or not really a PDF.`,
    );
  }
  const total = doc.getPageCount();
  if (edits.length !== total) {
    throw new RotateError(
      `${name} has ${total} pages but ${edits.length} were set up. Open it again.`,
    );
  }
  if (!edits.some((e) => e.keep)) {
    throw new RotateError('Keep at least one page. A PDF cannot be empty.');
  }
  onProgress({ stage: 'reading', progress: 1 });

  onProgress({ stage: 'working', progress: 0 });
  let rotated = 0;
  const pages = doc.getPages();
  for (const [i, page] of pages.entries()) {
    const edit = edits[i];
    const turns = edit ? edit.turns : 0;
    if (edit?.keep && toDegrees(turns) !== 0) {
      const existing = Math.round(page.getRotation().angle / 90);
      page.setRotation(degrees(toDegrees(existing + turns)));
      rotated++;
    }
    onProgress({ stage: 'working', progress: (i + 1) / total });
  }
  // Remove from the back so earlier indexes stay put.
  let removed = 0;
  for (let i = total - 1; i >= 0; i--) {
    if (!edits[i]?.keep) {
      doc.removePage(i);
      removed++;
    }
  }

  onProgress({ stage: 'packing', progress: 0 });
  const saved = await doc.save();
  onProgress({ stage: 'packing', progress: 1 });
  return { bytes: saved, name: rotateName(name), pages: doc.getPageCount(), rotated, removed };
}
