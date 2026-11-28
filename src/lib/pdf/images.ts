import { PDFDocument, type PDFImage } from 'pdf-lib';
import { placeImage, type ImagesOptions } from './page-layout';

export { DEFAULT_OPTIONS, MARGINS, PAGE_SIZES, placeImage } from './page-layout';
export type { ImagesOptions, Margin, Orientation, PageSize, Placement } from './page-layout';

export type ImagesStage = 'reading' | 'working' | 'packing';

export interface ImagesProgress {
  stage: ImagesStage;
  /** How far through this stage, 0 to 1. */
  progress: number;
}

/** Encoded image bytes pdf-lib can embed as they are. */
export interface ReadyImage {
  kind: 'jpg' | 'png';
  bytes: Uint8Array;
}

/**
 * Turns any other image (WebP, GIF, rotated JPEG...) into a JPEG or PNG the
 * PDF can hold, upright. In the browser this draws to a canvas.
 */
export type ImageDecoder = (bytes: Uint8Array, type: string) => Promise<ReadyImage>;

export interface ImageSource {
  name: string;
  /** MIME type when known. Used with the file signature to pick a path. */
  type: string;
  bytes: ArrayBuffer | Uint8Array;
  /** A HEIC photo the page could not decode before it got here. */
  undecoded?: boolean;
}

export interface ImagesResult {
  bytes: Uint8Array;
  name: string;
  pages: number;
}

export class ImagesError extends Error {
  constructor(
    message: string,
    readonly fileName?: string,
  ) {
    super(message);
    this.name = 'ImagesError';
  }
}

const isJpeg = (b: Uint8Array) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
const isPng = (b: Uint8Array) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;

/**
 * The EXIF orientation of a JPEG (1 to 8), or 1 when there is none. Phones
 * save photos sideways and set this tag; a PDF ignores it, so anything other
 * than 1 has to be turned upright before it goes in.
 */
export function jpegOrientation(bytes: Uint8Array): number {
  if (!isJpeg(bytes)) return 1;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    if (view.getUint8(offset) !== 0xff) return 1;
    const marker = view.getUint8(offset + 1);
    const length = view.getUint16(offset + 2);
    // Start of scan: the image data begins and there are no more headers.
    if (marker === 0xda) return 1;
    if (marker === 0xe1 && offset + 10 <= view.byteLength) {
      const start = offset + 4;
      if (view.getUint32(start) === 0x45786966 && view.getUint16(start + 4) === 0) {
        return readTiffOrientation(view, start + 6);
      }
    }
    offset += 2 + length;
  }
  return 1;
}

function readTiffOrientation(view: DataView, tiff: number): number {
  if (tiff + 8 > view.byteLength) return 1;
  const order = view.getUint16(tiff);
  if (order !== 0x4949 && order !== 0x4d4d) return 1;
  const little = order === 0x4949;
  const ifd = tiff + view.getUint32(tiff + 4, little);
  if (ifd + 2 > view.byteLength) return 1;
  const entries = view.getUint16(ifd, little);
  for (let i = 0; i < entries; i++) {
    const entry = ifd + 2 + i * 12;
    if (entry + 12 > view.byteLength) return 1;
    if (view.getUint16(entry, little) === 0x0112) {
      const value = view.getUint16(entry + 8, little);
      return value >= 1 && value <= 8 ? value : 1;
    }
  }
  return 1;
}

const baseName = (name: string) => name.replace(/\.[^.]+$/, '').trim() || 'images';

/** "beach.jpg" -> "beach.pdf"; several images -> "beach-and-3-more.pdf". */
export function imagesPdfName(names: readonly string[]): string {
  const first = baseName(names[0] ?? '');
  return names.length > 1 ? `${first}-and-${names.length - 1}-more.pdf` : `${first}.pdf`;
}

/**
 * Put each image on its own page, in order. JPEGs and PNGs go in untouched
 * (no quality lost); everything else, and photos with an EXIF turn, goes
 * through `decode` first. Progress is real: one tick per image.
 */
export async function imagesToPdf(
  sources: readonly ImageSource[],
  options: ImagesOptions,
  decode: ImageDecoder,
  onProgress: (p: ImagesProgress) => void = () => {},
): Promise<ImagesResult> {
  if (sources.length === 0) throw new ImagesError('Add at least one image.');
  onProgress({ stage: 'reading', progress: 0 });
  const doc = await PDFDocument.create();
  doc.setProducer('PDFPip');
  doc.setCreator('PDFPip');
  onProgress({ stage: 'reading', progress: 1 });

  onProgress({ stage: 'working', progress: 0 });
  for (const [i, source] of sources.entries()) {
    const bytes = source.bytes instanceof Uint8Array ? source.bytes : new Uint8Array(source.bytes);
    const heic = /\.hei[cf]$/i.test(source.name) || /hei[cf]/i.test(source.type);
    let image: PDFImage;
    try {
      if (source.undecoded) throw new Error('not decoded');
      // A decoded HEIC arrives as a lossless PNG copy; a JPEG keeps the PDF photo-sized.
      image = await embed(doc, bytes, source.type, decode, heic);
    } catch {
      throw new ImagesError(
        heic
          ? `${source.name} could not be read. It may be damaged, or a HEIC variant this browser cannot decode.`
          : `${source.name} could not be read. It may be damaged, or a kind of image this browser cannot open.`,
        source.name,
      );
    }
    const spot = placeImage(image.width, image.height, options);
    const page = doc.addPage([spot.pageW, spot.pageH]);
    page.drawImage(image, { x: spot.x, y: spot.y, width: spot.w, height: spot.h });
    onProgress({ stage: 'working', progress: (i + 1) / sources.length });
  }

  onProgress({ stage: 'packing', progress: 0 });
  const saved = await doc.save();
  onProgress({ stage: 'packing', progress: 1 });
  return {
    bytes: saved,
    name: imagesPdfName(sources.map((s) => s.name)),
    pages: doc.getPageCount(),
  };
}

async function embed(
  doc: PDFDocument,
  bytes: Uint8Array,
  type: string,
  decode: ImageDecoder,
  redraw = false,
): Promise<PDFImage> {
  if (!redraw && isJpeg(bytes) && jpegOrientation(bytes) === 1) return doc.embedJpg(bytes);
  if (!redraw && isPng(bytes)) return doc.embedPng(bytes);
  const ready = await decode(bytes, type);
  return ready.kind === 'jpg' ? doc.embedJpg(ready.bytes) : doc.embedPng(ready.bytes);
}
