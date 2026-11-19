import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { pagesIn, type PageRange } from './ranges';

export type SplitStage = 'reading' | 'working' | 'packing';

export interface SplitProgress {
  stage: SplitStage;
  /** How far through this stage, 0 to 1. */
  progress: number;
}

/**
 * `extract`: every chosen page goes into one new PDF.
 * `separate`: one PDF per range, bundled in a zip when there is more than one.
 */
export type SplitMode = 'extract' | 'separate';

export interface SplitRequest {
  name: string;
  bytes: ArrayBuffer | Uint8Array;
  ranges: readonly PageRange[];
  mode: SplitMode;
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

const baseName = (name: string) => name.replace(/\.pdf$/i, '').trim() || 'document';
const rangeLabel = ({ from, to }: PageRange) => (from === to ? `${from}` : `${from}-${to}`);

/** "report.pdf" + pages 1-3 -> "report-pages-1-3.pdf". */
export function splitName(name: string, ranges: readonly PageRange[], mode: SplitMode): string {
  const base = baseName(name);
  if (mode === 'separate' && ranges.length > 1) return `${base}-split.zip`;
  if (ranges.length === 1 && ranges[0]) {
    const r = ranges[0];
    return `${base}-${r.from === r.to ? 'page' : 'pages'}-${rangeLabel(r)}.pdf`;
  }
  return `${base}-extract.pdf`;
}

/**
 * Pull pages out of a PDF. Progress is real: reading the file, then one tick
 * per new document copied, then saving (and zipping, for several files).
 */
export async function splitPdf(
  { name, bytes, ranges, mode }: SplitRequest,
  onProgress: (p: SplitProgress) => void = () => {},
): Promise<SplitResult> {
  if (ranges.length === 0) throw new SplitError('Choose at least one page to keep.');

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
  if (ranges.some((r) => r.from < 1 || r.to > total || r.from > r.to)) {
    throw new SplitError(`Some of those pages are not in ${name}. It has ${total} pages.`);
  }
  onProgress({ stage: 'reading', progress: 1 });

  // Each group becomes one output file, pages listed 1-based.
  const groups: { label: string; pages: number[] }[] =
    mode === 'separate'
      ? ranges.map((r) => ({ label: rangeLabel(r), pages: pagesIn([r]) }))
      : [{ label: '', pages: pagesIn(ranges) }];

  onProgress({ stage: 'working', progress: 0 });
  const outputs: { label: string; doc: PDFDocument }[] = [];
  for (const [i, group] of groups.entries()) {
    const doc = await PDFDocument.create();
    try {
      const copied = await doc.copyPages(
        source,
        group.pages.map((p) => p - 1),
      );
      for (const page of copied) doc.addPage(page);
    } catch {
      throw new SplitError(`Some pages in ${name} could not be copied. It may be damaged.`);
    }
    outputs.push({ label: group.label, doc });
    onProgress({ stage: 'working', progress: (i + 1) / groups.length });
  }

  onProgress({ stage: 'packing', progress: 0 });
  const pages = outputs.reduce((sum, o) => sum + o.doc.getPageCount(), 0);
  const fileName = splitName(name, ranges, mode);
  const only = outputs.length === 1 ? outputs[0] : undefined;
  if (only) {
    const saved = await only.doc.save();
    onProgress({ stage: 'packing', progress: 1 });
    return { bytes: saved, name: fileName, type: 'application/pdf', files: 1, pages };
  }

  const zip = new JSZip();
  const base = baseName(name);
  for (const [i, out] of outputs.entries()) {
    const label = out.label.includes('-') ? `pages-${out.label}` : `page-${out.label}`;
    // Number the entries so they list in the order the ranges were typed.
    const prefix = String(i + 1).padStart(String(outputs.length).length, '0');
    zip.file(`${prefix}-${base}-${label}.pdf`, await out.doc.save());
    onProgress({ stage: 'packing', progress: ((i + 1) / outputs.length) * 0.5 });
  }
  const zipped = await zip.generateAsync({ type: 'uint8array' }, (meta) =>
    onProgress({ stage: 'packing', progress: 0.5 + meta.percent / 200 }),
  );
  onProgress({ stage: 'packing', progress: 1 });
  return {
    bytes: zipped,
    name: fileName,
    type: 'application/zip',
    files: outputs.length,
    pages,
  };
}
