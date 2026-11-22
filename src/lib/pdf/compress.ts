import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRawStream,
  PDFRef,
  PDFStream,
  decodePDFRawStream,
  type PDFObject,
} from 'pdf-lib';
import { compressName } from './file-names';

export { compressName, savedPercent } from './file-names';

export type CompressStage = 'reading' | 'working' | 'packing';

export interface CompressProgress {
  stage: CompressStage;
  /** How far through this stage, 0 to 1. */
  progress: number;
}

export type CompressLevel = 'light' | 'balanced' | 'strong';

/** How hard each level squeezes photos. Light leaves them alone. */
export const LEVELS: Record<CompressLevel, { maxEdge: number; quality: number } | null> = {
  light: null,
  balanced: { maxEdge: 2000, quality: 0.72 },
  strong: { maxEdge: 1400, quality: 0.5 },
};

/** One photo pulled out of the PDF, ready to be re-saved smaller. */
export type SourceImage =
  | { kind: 'jpeg'; bytes: Uint8Array; width: number; height: number }
  /** Plain pixels, four bytes (RGBA) per pixel. */
  | { kind: 'pixels'; rgba: Uint8ClampedArray; width: number; height: number };

export interface RecodedImage {
  /** A baseline RGB JPEG. */
  bytes: Uint8Array;
  width: number;
  height: number;
}

/**
 * Re-save one image as JPEG no larger than `maxEdge` on its long side. The
 * browser version lives in the worker (it needs OffscreenCanvas); tests pass
 * a fake. Return null to leave the image as it was.
 */
export type ImageRecoder = (
  image: SourceImage,
  options: { maxEdge: number; quality: number },
) => Promise<RecodedImage | null>;

export interface CompressRequest {
  name: string;
  bytes: ArrayBuffer | Uint8Array;
  level: CompressLevel;
}

export interface CompressResult {
  bytes: Uint8Array;
  name: string;
  /** Size of the file that came in. */
  before: number;
  /** Size of the file going out. Never more than `before`. */
  after: number;
  /** Photos that could be looked at. */
  images: number;
  /** Photos that came out smaller and were swapped in. */
  shrunk: number;
  /** False when nothing could be saved and the original is handed back. */
  smaller: boolean;
}

export class CompressError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CompressError';
  }
}

const N = (name: string) => PDFName.of(name);
/** Images smaller than this are not worth the round trip. */
const MIN_IMAGE_BYTES = 8 * 1024;

const num = (dict: PDFDict, key: string) => {
  const v = dict.lookup(N(key));
  return v instanceof PDFNumber ? v.asNumber() : undefined;
};

/** The single filter on a stream, or null when there is none or more than one. */
function onlyFilter(dict: PDFDict): string | null {
  const f = dict.lookup(N('Filter'));
  if (f instanceof PDFName) return f.decodeText();
  if (f instanceof PDFArray && f.size() === 1) {
    const first = f.lookup(0);
    if (first instanceof PDFName) return first.decodeText();
  }
  return null;
}

/** 1 for gray, 3 for RGB, otherwise null (CMYK, indexed, Lab and friends are skipped). */
function channels(dict: PDFDict): 1 | 3 | null {
  const cs = dict.lookup(N('ColorSpace'));
  if (cs instanceof PDFName) {
    const name = cs.decodeText();
    return name === 'DeviceRGB' ? 3 : name === 'DeviceGray' ? 1 : null;
  }
  if (cs instanceof PDFArray && cs.size() === 2) {
    const kind = cs.lookup(0);
    const profile = cs.lookup(1);
    if (
      kind instanceof PDFName &&
      kind.decodeText() === 'ICCBased' &&
      profile instanceof PDFStream
    ) {
      const n = num(profile.dict, 'N');
      return n === 3 ? 3 : n === 1 ? 1 : null;
    }
  }
  return null;
}

/**
 * Undo PNG row filters (Predictor 10 to 15). Each row starts with a filter
 * byte; `bpp` is bytes per pixel.
 */
export function unpredictPng(data: Uint8Array, rowBytes: number, bpp: number): Uint8Array {
  const rows = Math.floor(data.length / (rowBytes + 1));
  const out = new Uint8Array(rows * rowBytes);
  for (let r = 0; r < rows; r++) {
    const type = data[r * (rowBytes + 1)] as number;
    const src = r * (rowBytes + 1) + 1;
    const dst = r * rowBytes;
    for (let i = 0; i < rowBytes; i++) {
      const raw = data[src + i] as number;
      const left = i >= bpp ? (out[dst + i - bpp] as number) : 0;
      const up = r > 0 ? (out[dst - rowBytes + i] as number) : 0;
      const upLeft = r > 0 && i >= bpp ? (out[dst - rowBytes + i - bpp] as number) : 0;
      let value: number;
      if (type === 1) value = raw + left;
      else if (type === 2) value = raw + up;
      else if (type === 3) value = raw + ((left + up) >> 1);
      else if (type === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        value = raw + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft);
      } else value = raw;
      out[dst + i] = value & 255;
    }
  }
  return out;
}

/** Spread gray or RGB samples out to RGBA for a canvas. */
export function toRgba(samples: Uint8Array, pixels: number, comps: 1 | 3): Uint8ClampedArray {
  const out = new Uint8ClampedArray(pixels * 4);
  for (let p = 0; p < pixels; p++) {
    const s = p * comps;
    out[p * 4] = samples[s] as number;
    out[p * 4 + 1] = samples[comps === 3 ? s + 1 : s] as number;
    out[p * 4 + 2] = samples[comps === 3 ? s + 2 : s] as number;
    out[p * 4 + 3] = 255;
  }
  return out;
}

/**
 * Pull an image out of its stream in a form the recoder can use, or null when
 * it is a kind we leave alone (masks, odd colour spaces, color-key masks,
 * custom decode arrays, anything not 8 bits).
 */
function readImage(stream: PDFRawStream): SourceImage | null {
  const { dict } = stream;
  if (dict.lookup(N('ImageMask'))?.toString() === 'true') return null;
  if (dict.has(N('Mask')) && dict.lookup(N('Mask')) instanceof PDFArray) return null;
  if (dict.has(N('Decode'))) return null;
  const width = num(dict, 'Width');
  const height = num(dict, 'Height');
  if (!width || !height || num(dict, 'BitsPerComponent') !== 8) return null;
  if (stream.contents.length < MIN_IMAGE_BYTES) return null;
  const comps = channels(dict);
  const filter = onlyFilter(dict);

  if (filter === 'DCTDecode') {
    // Gray and RGB only; CMYK JPEGs often come out inverted after a redraw.
    if (comps === null) return null;
    return { kind: 'jpeg', bytes: stream.contents, width, height };
  }
  if (filter === 'FlateDecode' && comps !== null) {
    let samples = decodePDFRawStream(stream).decode();
    const parms = dict.lookup(N('DecodeParms'));
    const predictor = parms instanceof PDFDict ? (num(parms, 'Predictor') ?? 1) : 1;
    if (predictor >= 10) samples = unpredictPng(samples, width * comps, comps);
    else if (predictor !== 1) return null;
    if (samples.length < width * height * comps) return null;
    return { kind: 'pixels', rgba: toRgba(samples, width * height, comps), width, height };
  }
  return null;
}

/** Run `fn`, treating a throw as "skip this one". */
function safely<T>(fn: () => T | null): T | null {
  try {
    return fn();
  } catch {
    return null;
  }
}

/** Every object reachable from the trailer; the rest is dead weight. */
function reachable(doc: PDFDocument): Set<PDFRef> {
  const { context } = doc;
  const seen = new Set<PDFRef>();
  const stack: PDFObject[] = [];
  const { Root, Info } = context.trailerInfo;
  if (Root) stack.push(Root);
  if (Info) stack.push(Info);
  while (stack.length) {
    const obj = stack.pop();
    if (obj instanceof PDFRef) {
      if (seen.has(obj)) continue;
      seen.add(obj);
      const target = context.lookup(obj);
      if (target) stack.push(target);
    } else if (obj instanceof PDFDict) {
      for (const [, v] of obj.entries()) stack.push(v);
    } else if (obj instanceof PDFArray) {
      for (let i = 0; i < obj.size(); i++) stack.push(obj.get(i));
    } else if (obj instanceof PDFStream) {
      stack.push(obj.dict);
    }
  }
  return seen;
}

/**
 * Drop what readers never show: XMP packets, page thumbnails, editor
 * leftovers and the author / software fields. The title stays, since PDF
 * viewers show it in the tab.
 */
function stripExtras(doc: PDFDocument) {
  doc.catalog.delete(N('Metadata'));
  doc.catalog.delete(N('PieceInfo'));
  for (const page of doc.getPages()) {
    for (const key of ['Metadata', 'PieceInfo', 'Thumb']) page.node.delete(N(key));
  }
  const info = doc.context.lookup(doc.context.trailerInfo.Info);
  if (info instanceof PDFDict) {
    for (const key of ['Author', 'Creator', 'Producer', 'Subject', 'Keywords']) {
      info.delete(N(key));
    }
  }
}

/**
 * Make a PDF smaller without sending it anywhere. Every level strips hidden
 * extras and unused objects and packs the rest into object streams; balanced
 * and strong also re-save large photos as smaller JPEGs. A photo is only
 * swapped when the new one is smaller, and if the whole file does not shrink
 * the original comes back untouched.
 */
export async function compressPdf(
  { name, bytes, level }: CompressRequest,
  recode: ImageRecoder,
  onProgress: (p: CompressProgress) => void = () => {},
): Promise<CompressResult> {
  const input = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const before = input.length;
  onProgress({ stage: 'reading', progress: 0 });
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(input, { updateMetadata: false });
    if (doc.getPageCount() === 0) throw new Error('no pages');
  } catch (err) {
    const locked = err instanceof Error && /encrypt/i.test(err.message);
    throw new CompressError(
      locked
        ? `${name} is password protected. Unlock it first, then try again.`
        : `${name} could not be read. It may be damaged or not really a PDF.`,
    );
  }
  onProgress({ stage: 'reading', progress: 1 });

  onProgress({ stage: 'working', progress: 0 });
  stripExtras(doc);
  const live = reachable(doc);
  for (const [ref] of doc.context.enumerateIndirectObjects()) {
    if (!live.has(ref)) doc.context.delete(ref);
  }

  const settings = LEVELS[level];
  const candidates = doc.context
    .enumerateIndirectObjects()
    .filter(
      (entry): entry is [PDFRef, PDFRawStream] =>
        entry[1] instanceof PDFRawStream &&
        entry[1].dict.lookup(N('Subtype'))?.toString() === '/Image',
    );
  let shrunk = 0;
  if (settings) {
    for (const [i, [ref, stream]] of candidates.entries()) {
      const source = safely(() => readImage(stream));
      const result = source ? await recode(source, settings).catch(() => null) : null;
      if (result && result.bytes.length < stream.contents.length) {
        const dict = stream.dict.clone(doc.context);
        dict.set(N('Filter'), N('DCTDecode'));
        dict.set(N('ColorSpace'), N('DeviceRGB'));
        dict.set(N('BitsPerComponent'), PDFNumber.of(8));
        dict.set(N('Width'), PDFNumber.of(result.width));
        dict.set(N('Height'), PDFNumber.of(result.height));
        dict.set(N('Length'), PDFNumber.of(result.bytes.length));
        dict.delete(N('DecodeParms'));
        doc.context.assign(ref, PDFRawStream.of(dict, result.bytes));
        shrunk++;
      }
      onProgress({ stage: 'working', progress: (i + 1) / candidates.length });
    }
  }
  onProgress({ stage: 'working', progress: 1 });

  onProgress({ stage: 'packing', progress: 0 });
  const saved = await doc.save({ useObjectStreams: true });
  onProgress({ stage: 'packing', progress: 1 });
  const smaller = saved.length < before;
  return {
    bytes: smaller ? saved : input.slice(),
    name: compressName(name),
    before,
    after: smaller ? saved.length : before,
    images: candidates.length,
    shrunk,
    smaller,
  };
}
