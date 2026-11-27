import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import type { PlannedFile } from './split-plan';

export type SplitStage = 'reading' | 'working' | 'packing';

export interface SplitProgress {
  stage: SplitStage;
  /** How far through this stage, 0 to 1. */
  progress: number;
}

export interface SplitRequest {
  name: string;
  bytes: ArrayBuffer | Uint8Array;
  /** The files to make, from planSplit. */
  files: readonly Pick<PlannedFile, 'name' | 'pages'>[];
  /** Name of the zip when there is more than one file. */
  zipName: string;
}

export interface SplitResult {
  bytes: Uint8Array;
  /** File name to save as. */
  name: string;
  type: 'application/pdf' | 'application/zip';
  /** Number of PDFs made. */
  files: number;
  /** Pages across all of them. */
  pages: number;
}

export class SplitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SplitError';
  }
}

/**
 * Pull pages out of a PDF. Progress is real: reading the file, then one tick
 * per new document copied, then saving (and zipping, for several files).
 */
export async function splitPdf(
  { name, bytes, files, zipName }: SplitRequest,
  onProgress: (p: SplitProgress) => void = () => {},
): Promise<SplitResult> {
  if (files.length === 0 || files.some((f) => f.pages.length === 0))
    throw new SplitError('Choose at least one page to keep.');

  onProgress({ stage: 'reading', progress: 0 });
  let source: PDFDocument;
  try {
    source = await PDFDocument.load(bytes);
    if (source.getPageCount() === 0) throw new Error('no pages');
  } catch (err) {
    const locked = err instanceof Error && /encrypt/i.test(err.message);
    throw new SplitError(
      locked
        ? `${name} is password protected. Unlock it first, then try again.`
        : `${name} could not be read. It may be damaged or not really a PDF.`,
    );
  }
  const total = source.getPageCount();
  if (files.some((f) => f.pages.some((p) => !Number.isInteger(p) || p < 1 || p > total))) {
    throw new SplitError(`Some of those pages are not in ${name}. It has ${total} pages.`);
  }
  onProgress({ stage: 'reading', progress: 1 });

  onProgress({ stage: 'working', progress: 0 });
  const outputs: { name: string; doc: PDFDocument }[] = [];
  for (const [i, file] of files.entries()) {
    const doc = await PDFDocument.create();
    try {
      const copied = await doc.copyPages(
        source,
        file.pages.map((p) => p - 1),
      );
      for (const page of copied) doc.addPage(page);
    } catch {
      throw new SplitError(`Some pages in ${name} could not be copied. It may be damaged.`);
    }
    outputs.push({ name: file.name, doc });
    onProgress({ stage: 'working', progress: (i + 1) / files.length });
  }

  onProgress({ stage: 'packing', progress: 0 });
  const pages = outputs.reduce((sum, o) => sum + o.doc.getPageCount(), 0);
  const only = outputs.length === 1 ? outputs[0] : undefined;
  if (only) {
    const saved = await only.doc.save();
    onProgress({ stage: 'packing', progress: 1 });
    return { bytes: saved, name: only.name, type: 'application/pdf', files: 1, pages };
  }

  const zip = new JSZip();
  for (const [i, out] of outputs.entries()) {
    zip.file(out.name, await out.doc.save());
    onProgress({ stage: 'packing', progress: ((i + 1) / outputs.length) * 0.5 });
  }
  const zipped = await zip.generateAsync({ type: 'uint8array' }, (meta) =>
    onProgress({ stage: 'packing', progress: 0.5 + meta.percent / 200 }),
  );
  onProgress({ stage: 'packing', progress: 1 });
  return {
    bytes: zipped,
    name: zipName,
    type: 'application/zip',
    files: outputs.length,
    pages,
  };
}
