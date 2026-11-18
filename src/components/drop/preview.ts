import { extensionOf } from './validate';

export interface FilePreview {
  /** Object URL of a small image, or null when the file cannot be drawn. */
  url: string | null;
  /** Page count for PDFs, null for images. */
  pages: number | null;
}

/** Images the browser can draw without help (HEIC needs converting first). */
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
  return pdfReady;
}

function canvasToUrl(canvas: HTMLCanvasElement): Promise<string | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ? URL.createObjectURL(blob) : null), 'image/png');
  });
}

/** Draw the first page of a PDF about `width` CSS pixels wide. */
async function previewPdf(file: File, width: number): Promise<FilePreview> {
  const { pdfjs, worker } = await loadPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({ data, worker });
  const doc = await task.promise;
  try {
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const scale = (width * Math.min(window.devicePixelRatio || 1, 2)) / base.width;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext('2d');
    if (!context) return { url: null, pages: doc.numPages };
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    return { url: await canvasToUrl(canvas), pages: doc.numPages };
  } finally {
    void task.destroy();
  }
}

/**
 * A small preview for a file in the list. The caller owns the returned URL
 * and must revoke it with URL.revokeObjectURL when done.
 */
export async function makePreview(file: File, width = 120): Promise<FilePreview> {
  if (isPdf(file)) return previewPdf(file, width);
  if (DRAWABLE.has(extensionOf(file.name)) || /^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
    return { url: URL.createObjectURL(file), pages: null };
  }
  return { url: null, pages: null };
}
