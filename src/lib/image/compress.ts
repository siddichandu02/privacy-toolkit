import JSZip from 'jszip';
import {
  compressedImageName,
  outputType,
  uniqueNames,
  type ImageCompressSettings,
} from './compress-names';

export * from './compress-names';

export type ImageCompressStage = 'reading' | 'working' | 'packing';

export interface SourceImage {
  name: string;
  type: string;
  bytes: ArrayBuffer;
}

export interface EncodeRequest {
  type: string;
  quality: number;
  maxEdge: number | null;
}

export interface Encoded {
  bytes: Uint8Array;
  /** What the browser actually wrote; it may fall back to PNG for WebP. */
  mime: string;
  width: number;
  height: number;
  /** Size before any resize, after the EXIF turn. */
  sourceWidth: number;
  sourceHeight: number;
}

/** Draws and re-saves one photo. The worker passes an OffscreenCanvas one. */
export type ImageEncoder = (source: SourceImage, request: EncodeRequest) => Promise<Encoded>;

export interface CompressedImage {
  name: string;
  type: string;
  before: number;
  after: number;
  /** The new copy was not smaller, so the original went in instead. */
  kept: boolean;
}

export interface SkippedImage {
  name: string;
  reason: string;
}

export interface ImageCompressResult {
  /** One photo, or a ZIP when there are several. */
  bytes: Uint8Array;
  name: string;
  mime: string;
  items: CompressedImage[];
  skipped: SkippedImage[];
  before: number;
  after: number;
}

export interface ImageCompressProgress {
  stage: ImageCompressStage;
  progress: number;
}

export class ImageCompressError extends Error {
  constructor(
    message: string,
    readonly fileName?: string,
  ) {
    super(message);
    this.name = 'ImageCompressError';
  }
}

export const ZIP_NAME = 'compressed-photos.zip';

const isHeic = (s: SourceImage) => /\.hei[cf]$/i.test(s.name) || /hei[cf]/i.test(s.type);

/** Plain reason a photo could not be opened. */
export function unreadableReason(source: SourceImage): string {
  return isHeic(source)
    ? 'HEIC photos cannot be opened in this browser yet. Save it as a JPG first.'
    : 'It could not be opened. It may be damaged or not really an image.';
}

/**
 * Re-save every photo at the chosen quality and size. A photo that cannot be
 * opened is skipped and named, so one bad file never sinks the batch. When a
 * re-saved copy comes out bigger and nothing else changed, the original is
 * kept instead.
 */
export async function compressImages(
  sources: readonly SourceImage[],
  settings: ImageCompressSettings,
  encode: ImageEncoder,
  onProgress: (p: ImageCompressProgress) => void = () => {},
): Promise<ImageCompressResult> {
  if (sources.length === 0) throw new ImageCompressError('Add at least one photo.');
  onProgress({ stage: 'reading', progress: 0.05 });

  const done: { item: CompressedImage; bytes: Uint8Array }[] = [];
  const skipped: SkippedImage[] = [];

  for (const [i, source] of sources.entries()) {
    const type = outputType(source.type, settings.format);
    let encoded: Encoded | null = null;
    try {
      encoded = await encode(source, {
        type,
        quality: settings.quality,
        maxEdge: settings.maxEdge,
      });
    } catch {
      skipped.push({ name: source.name, reason: unreadableReason(source) });
    }
    if (encoded) {
      const before = source.bytes.byteLength;
      const resized =
        encoded.width !== encoded.sourceWidth || encoded.height !== encoded.sourceHeight;
      const keep = !resized && encoded.mime === source.type && encoded.bytes.byteLength >= before;
      const bytes = keep ? new Uint8Array(source.bytes) : encoded.bytes;
      done.push({
        item: {
          name: keep ? source.name : compressedImageName(source.name, encoded.mime),
          type: keep ? source.type : encoded.mime,
          before,
          after: bytes.byteLength,
          kept: keep,
        },
        bytes,
      });
    }
    onProgress({ stage: 'working', progress: 0.1 + (0.75 * (i + 1)) / sources.length });
  }

  if (done.length === 0) {
    const only = sources.length === 1 ? sources[0] : undefined;
    throw new ImageCompressError(
      only
        ? `${only.name} could not be compressed. ${unreadableReason(only)}`
        : 'None of these photos could be opened. They may be damaged, or in a format this browser cannot read (like HEIC).',
      only?.name,
    );
  }

  const before = done.reduce((n, d) => n + d.item.before, 0);
  const after = done.reduce((n, d) => n + d.item.after, 0);
  const items = done.map((d) => d.item);

  const single = done.length === 1 ? done[0] : undefined;
  if (single) {
    onProgress({ stage: 'packing', progress: 1 });
    return {
      bytes: single.bytes,
      name: single.item.name,
      mime: single.item.type,
      items,
      skipped,
      before,
      after,
    };
  }

  onProgress({ stage: 'packing', progress: 0.9 });
  const zip = new JSZip();
  const names = uniqueNames(items.map((i) => i.name));
  // Photos are already compressed; storing them is as small and much faster.
  done.forEach((d, i) => zip.file(names[i] as string, d.bytes, { compression: 'STORE' }));
  const bytes = await zip.generateAsync({ type: 'uint8array' });
  onProgress({ stage: 'packing', progress: 1 });
  return { bytes, name: ZIP_NAME, mime: 'application/zip', items, skipped, before, after };
}
