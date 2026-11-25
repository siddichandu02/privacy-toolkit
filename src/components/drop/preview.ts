import { isHeic } from '../../lib/image/convert-names';
import { decodeHeicOnce } from '../../lib/image/heic';
import { extensionOf } from './validate';

export interface FilePreview {
  /** Object URL of a small image, or null when the file cannot be drawn. */
  url: string | null;
  /** Page count for PDFs, null for images. */
  pages: number | null;
}

/** Images the browser can draw without help (HEIC is opened on the device first). */
const DRAWABLE = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

export function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || extensionOf(file.name) === '.pdf';
}

type PdfJs = typeof import('pdfjs-dist');
interface PdfKit {
  pdfjs: PdfJs;
  worker: InstanceType<PdfJs['PDFWorker']>;
}
let pdfReady: Promise<PdfKit> | null = null;

/**
 * Load pdf.js on first use only, with its worker served from our own build
 * (no CDN), so the rest of the app stays light. One worker is shared by every
 * document; starting a new one per file is slow.
 */
function loadPdfJs(): Promise<PdfKit> {
  pdfReady ??= Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]).then(([pdfjs, workerUrl]) => {
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl.default;
    return { pdfjs, worker: new pdfjs.PDFWorker() };
  });
  // A failed load (offline for a moment, or files renamed by a deploy) must
  // not stick for the whole visit: forget it so the next preview tries again.
  pdfReady.catch(() => {
    pdfReady = null;
  });
  return pdfReady;
}

/**
 * Run at most `limit` tasks at once. Dropping 25 PDFs would otherwise parse
 * and draw all of them together, which is slow and can exhaust memory.
 */
export function limitConcurrency(limit: number) {
  let active = 0;
  const waiting: (() => void)[] = [];
  return async function run<T>(task: () => Promise<T>): Promise<T> {
    if (active >= limit) await new Promise<void>((resolve) => waiting.push(resolve));
    active += 1;
    try {
      return await task();
    } finally {
      active -= 1;
      waiting.shift()?.();
    }
  };
}

const previewSlot = limitConcurrency(3);

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

interface DrawnPage {
  blob: Blob | null;
  pages: number;
}

/**
 * First pages already drawn, per file and width. The file list and the wait
 * scene both want the same picture; drawing it once means the scene can show
 * it straight away. Kept only as long as the File itself is around.
 */
const drawn = new WeakMap<File, Map<number, Promise<DrawnPage>>>();

function drawFirstPage(file: File, width: number): Promise<DrawnPage> {
  let sizes = drawn.get(file);
  if (!sizes) drawn.set(file, (sizes = new Map()));
  const cached = sizes.get(width);
  if (cached) return cached;
  const made = previewSlot(() => previewPdf(file, width));
  sizes.set(width, made);
  // A file that could not be read this time may be readable next time.
  made.catch(() => sizes.delete(width));
  return made;
}

/** Biggest canvas we draw, in pixels. Phones refuse much larger ones. */
export const MAX_CANVAS_PIXELS = 16_000_000;

/** Draw the first page of a PDF about `width` CSS pixels wide. */
async function previewPdf(file: File, width: number): Promise<DrawnPage> {
  const { pdfjs, worker } = await loadPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({ data, worker });
  try {
    const doc = await task.promise;
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const wanted = (width * Math.min(window.devicePixelRatio || 1, 2)) / base.width;
    const most = Math.sqrt(MAX_CANVAS_PIXELS / (base.width * base.height));
    const viewport = page.getViewport({ scale: Math.min(wanted, most) });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext('2d');
    if (!context) return { blob: null, pages: doc.numPages };
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    page.cleanup();
    return { blob: await canvasToBlob(canvas), pages: doc.numPages };
  } finally {
    void task.destroy();
  }
}

/**
 * A small preview for a file in the list. The caller owns the returned URL
 * and must revoke it with URL.revokeObjectURL when done.
 */
export async function makePreview(file: File, width = 120): Promise<FilePreview> {
  if (isPdf(file)) {
    const { blob, pages } = await drawFirstPage(file, width);
    return { url: blob ? URL.createObjectURL(blob) : null, pages };
  }
  if (DRAWABLE.has(extensionOf(file.name)) || /^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
    return { url: URL.createObjectURL(file), pages: null };
  }
  if (isHeic(file)) {
    // The same decoded copy the tool uses later, so the photo is opened only once.
    const copy = await previewSlot(() => decodeHeicOnce(file)).catch(() => null);
    return { url: copy ? URL.createObjectURL(copy) : null, pages: null };
  }
  return { url: null, pages: null };
}

export interface PdfPages {
  count: number;
  /**
   * Draw one page (1-based) about `width` CSS pixels wide. Renders run one at
   * a time so a long document does not flood the worker. The caller owns the
   * returned URL and must revoke it.
   */
  render: (page: number, width: number) => Promise<string | null>;
  /** A page's shown size (after its own rotation) in PDF points. */
  size?: (page: number) => Promise<{ width: number; height: number }>;
  close: () => void;
}

/** Open a PDF to draw any of its pages on demand, e.g. for a page picker. */
export async function openPdfPages(file: File): Promise<PdfPages> {
  const { pdfjs, worker } = await loadPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({ data, worker });
  const doc = await task.promise.catch((err: unknown) => {
    void task.destroy();
    throw err;
  });
  let closed = false;
  let queue: Promise<unknown> = Promise.resolve();

  const draw = async (n: number, width: number): Promise<string | null> => {
    if (closed) return null;
    const page = await doc.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const wanted = (width * Math.min(window.devicePixelRatio || 1, 2)) / base.width;
    const most = Math.sqrt(MAX_CANVAS_PIXELS / (base.width * base.height));
    const viewport = page.getViewport({ scale: Math.min(wanted, most) });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext('2d');
    if (!context || closed) return null;
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    page.cleanup();
    if (closed) return null;
    const blob = await canvasToBlob(canvas);
    return blob && !closed ? URL.createObjectURL(blob) : null;
  };

  return {
    count: doc.numPages,
    render: (n, width) => {
      const next = queue.then(() => draw(n, width));
      queue = next.catch(() => null);
      return next;
    },
    size: async (n) => {
      const page = await doc.getPage(n);
      const { width, height } = page.getViewport({ scale: 1 });
      return { width, height };
    },
    close: () => {
      closed = true;
      void task.destroy();
    },
  };
}
