import { PDFDocument } from 'pdf-lib';

export type MergeStage = 'reading' | 'working' | 'packing';

export interface MergeProgress {
  stage: MergeStage;
  /** How far through this stage, 0 to 1. */
  progress: number;
}

export interface MergeSource {
  name: string;
  bytes: ArrayBuffer | Uint8Array;
}

export class MergeError extends Error {
  constructor(
    message: string,
    /** Name of the file that could not be read, when there is one. */
    readonly fileName?: string,
  ) {
    super(message);
    this.name = 'MergeError';
  }
}

/**
 * Join PDFs in the given order into one document. Reports real progress:
 * once per file read, once per file copied, then while saving.
 */
export interface MergeResult {
  bytes: Uint8Array;
  /** Pages in the merged file. */
  pages: number;
}

export async function mergePdfs(
  sources: readonly MergeSource[],
  onProgress: (p: MergeProgress) => void = () => {},
): Promise<MergeResult> {
  if (sources.length === 0) throw new MergeError('There are no files to merge.');

  onProgress({ stage: 'reading', progress: 0 });
  const docs: PDFDocument[] = [];
  for (const [i, source] of sources.entries()) {
    try {
      const doc = await PDFDocument.load(source.bytes, { ignoreEncryption: false });
      // pdf-lib is lenient: a file with a PDF header but a broken body loads
      // fine and only fails later. Touching the page tree catches that here.
      if (doc.getPageCount() === 0) throw new Error('no pages');
      docs.push(doc);
    } catch (err) {
      const locked = err instanceof Error && /encrypt/i.test(err.message);
      throw new MergeError(
        locked
          ? `${source.name} is password protected. Unlock it first, then try again.`
          : `${source.name} could not be read. It may be damaged or not really a PDF.`,
        source.name,
      );
    }
    onProgress({ stage: 'reading', progress: (i + 1) / sources.length });
  }

  onProgress({ stage: 'working', progress: 0 });
  const out = await PDFDocument.create();
  for (const [i, doc] of docs.entries()) {
    const name = sources[i]?.name ?? 'One of the files';
    try {
      const pages = await out.copyPages(doc, doc.getPageIndices());
      for (const page of pages) out.addPage(page);
    } catch {
      throw new MergeError(`${name} has pages that could not be copied. It may be damaged.`, name);
    }
    onProgress({ stage: 'working', progress: (i + 1) / docs.length });
  }

  onProgress({ stage: 'packing', progress: 0 });
  const bytes = await out.save();
  onProgress({ stage: 'packing', progress: 1 });
  return { bytes, pages: out.getPageCount() };
}

/** "report.pdf" -> "report-merged.pdf". Falls back to "merged.pdf". */
export function mergedName(first?: string): string {
  const base = first?.replace(/\.pdf$/i, '').trim();
  return base ? `${base}-merged.pdf` : 'merged.pdf';
}
