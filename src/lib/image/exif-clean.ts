import JSZip from 'jszip';
import type { ImageEncoder, SkippedImage } from './compress';
import { uniqueNames } from './compress-names';
import type { ConvertSource } from './convert';
import { convertedName, isHeic } from './convert-names';
import { stripImage, stripKind } from './exif-strip';

export type CleanStage = 'reading' | 'working' | 'packing';

export interface CleanedImage {
  name: string;
  before: number;
  after: number;
  /** 'lossless': same picture, details cut out. 'redrawn': saved again as a new file. */
  method: 'lossless' | 'redrawn';
}

export interface CleanResult {
  bytes: Uint8Array;
  name: string;
  mime: string;
  items: CleanedImage[];
  skipped: SkippedImage[];
}

export interface CleanProgress {
  stage: CleanStage;
  progress: number;
}

export class CleanError extends Error {
  constructor(
    message: string,
    readonly fileName?: string,
  ) {
    super(message);
    this.name = 'CleanError';
  }
}

export const CLEAN_ZIP_NAME = 'photos-without-details.zip';

const MIME = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' } as const;

function failReason(source: ConvertSource) {
  return isHeic(source)
    ? 'This HEIC photo could not be read. It may be damaged, or use a variant this browser cannot decode.'
    : 'It could not be opened. It may be damaged or not really an image.';
}

/**
 * Remove the hidden details from every photo. JPEG, PNG and WebP are cut
 * losslessly; anything else (HEIC already decoded on the page, GIF, AVIF,
 * BMP) is redrawn, which leaves every detail behind: HEIC as JPG, the rest as
 * PNG. A photo that cannot be opened is skipped and named.
 */
export async function cleanImages(
  sources: readonly ConvertSource[],
  encode: ImageEncoder,
  onProgress: (p: CleanProgress) => void = () => {},
): Promise<CleanResult> {
  if (sources.length === 0) throw new CleanError('Add at least one photo.');
  onProgress({ stage: 'reading', progress: 0.05 });

  const done: { item: CleanedImage; bytes: Uint8Array; mime: string }[] = [];
  const skipped: SkippedImage[] = [];

  for (const [i, source] of sources.entries()) {
    const before = source.size ?? source.bytes.byteLength;
    const bytes = new Uint8Array(source.bytes);
    const kind = source.undecoded ? null : stripKind(bytes);
    let out: { bytes: Uint8Array; mime: string; method: CleanedImage['method'] } | null = null;
    if (kind) {
      try {
        out = { bytes: stripImage(bytes), mime: MIME[kind], method: 'lossless' };
      } catch {
        out = null;
      }
    }
    // A broken container may still draw, so try redrawing before giving up.
    if (!out && !source.undecoded) {
      const type = isHeic(source) ? 'image/jpeg' : 'image/png';
      try {
        const e = await encode(source, { type, quality: 0.92, maxEdge: null });
        out = { bytes: e.bytes, mime: e.mime, method: 'redrawn' };
      } catch {
        out = null;
      }
    }
    if (out) {
      const name = out.method === 'lossless' ? source.name : convertedName(source.name, out.mime);
      done.push({
        item: { name, before, after: out.bytes.byteLength, method: out.method },
        bytes: out.bytes,
        mime: out.mime,
      });
    } else {
      skipped.push({ name: source.name, reason: failReason(source) });
    }
    onProgress({ stage: 'working', progress: 0.1 + (0.75 * (i + 1)) / sources.length });
  }

  if (done.length === 0) {
    const only = sources.length === 1 ? sources[0] : undefined;
    throw new CleanError(
      only
        ? `${only.name} could not be cleaned. ${failReason(only)}`
        : 'None of these photos could be opened. They may be damaged or not really images.',
      only?.name,
    );
  }

  const items = done.map((d) => d.item);
  const single = done.length === 1 ? done[0] : undefined;
  if (single) {
    onProgress({ stage: 'packing', progress: 1 });
    return { bytes: single.bytes, name: single.item.name, mime: single.mime, items, skipped };
  }

  onProgress({ stage: 'packing', progress: 0.9 });
  const zip = new JSZip();
  const names = uniqueNames(items.map((i) => i.name));
  done.forEach((d, i) => zip.file(names[i] as string, d.bytes, { compression: 'STORE' }));
  const bytes = await zip.generateAsync({ type: 'uint8array' });
  onProgress({ stage: 'packing', progress: 1 });
  return { bytes, name: CLEAN_ZIP_NAME, mime: 'application/zip', items, skipped };
}
