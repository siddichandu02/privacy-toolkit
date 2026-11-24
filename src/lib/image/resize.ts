import JSZip from 'jszip';
import type { Encoded, ImageEncoder, SkippedImage, SourceImage } from './compress';
import { uniqueNames } from './compress-names';
import { isHeic } from './convert-names';
import {
  CENTERED,
  cropBox,
  fitInside,
  resizedName,
  resizeOutputType,
  type CropView,
} from './resize-names';

export * from './resize-names';

export type ResizeStage = 'reading' | 'working' | 'packing';

/** What to make. Every photo in a batch gets the same size. */
export interface ResizeSettings {
  width: number;
  height: number;
  /**
   * True cuts every photo to exactly `width` by `height`. False keeps each
   * whole photo and fits it inside that box, so nothing is cut off.
   */
  cut: boolean;
  /** Framing per photo, by position. Missing ones are centred. */
  views?: (CropView | null)[];
  /** 0.5 to 1, for JPG and WebP. */
  quality: number;
}

/** A photo ready to draw. HEIC photos arrive already decoded, under their own name. */
export interface ResizeSource extends SourceImage {
  /** Size of the file the person picked, before any decoding. */
  size?: number;
  /** The HEIC photo could not be decoded before it got here. */
  undecoded?: boolean;
}

export interface ResizedImage {
  name: string;
  width: number;
  height: number;
  /** Size of the photo it came from, upright. */
  sourceWidth: number;
  sourceHeight: number;
  before: number;
  after: number;
}

export interface ResizeResult {
  /** One photo, or a ZIP when there are several. */
  bytes: Uint8Array;
  name: string;
  mime: string;
  items: ResizedImage[];
  skipped: SkippedImage[];
}

export interface ResizeProgress {
  stage: ResizeStage;
  progress: number;
}

export class ResizeError extends Error {
  constructor(
    message: string,
    readonly fileName?: string,
  ) {
    super(message);
    this.name = 'ResizeError';
  }
}

export const RESIZE_QUALITY = 0.92;
export const RESIZE_ZIP_NAME = 'resized-photos.zip';

function failReason(source: ResizeSource): string {
  return isHeic(source)
    ? 'This HEIC photo could not be read. It may be damaged, or use a variant this browser cannot decode.'
    : 'It could not be opened. It may be damaged or not really an image.';
}

/**
 * Cut or fit every photo to the chosen size. A photo that cannot be opened is
 * skipped and named, so one bad file never sinks the batch. Several photos
 * come back in one ZIP.
 */
export async function resizeImages(
  sources: readonly ResizeSource[],
  settings: ResizeSettings,
  encode: ImageEncoder,
  onProgress: (p: ResizeProgress) => void = () => {},
): Promise<ResizeResult> {
  const { width, height, cut } = settings;
  if (!(width >= 1 && height >= 1)) throw new ResizeError('Pick a size of at least 1 pixel.');
  if (sources.length === 0) throw new ResizeError('Add at least one photo.');
  onProgress({ stage: 'reading', progress: 0.05 });

  const aspect = width / height;
  const done: { item: ResizedImage; bytes: Uint8Array; mime: string }[] = [];
  const skipped: SkippedImage[] = [];

  for (const [i, source] of sources.entries()) {
    const view = settings.views?.[i] ?? CENTERED;
    let encoded: Encoded | null = null;
    if (!source.undecoded) {
      try {
        encoded = await encode(source, {
          type: resizeOutputType(source),
          quality: settings.quality,
          maxEdge: null,
          fit: (srcW, srcH) =>
            cut
              ? { crop: cropBox(srcW, srcH, aspect, view), size: { width, height } }
              : { crop: null, size: fitInside(srcW, srcH, width, height) },
        });
      } catch {
        encoded = null;
      }
    }
    if (encoded) {
      done.push({
        item: {
          name: resizedName(source.name, encoded.width, encoded.height, encoded.mime),
          width: encoded.width,
          height: encoded.height,
          sourceWidth: encoded.sourceWidth,
          sourceHeight: encoded.sourceHeight,
          before: source.size ?? source.bytes.byteLength,
          after: encoded.bytes.byteLength,
        },
        bytes: encoded.bytes,
        mime: encoded.mime,
      });
    } else {
      skipped.push({ name: source.name, reason: failReason(source) });
    }
    onProgress({ stage: 'working', progress: 0.1 + (0.75 * (i + 1)) / sources.length });
  }

  if (done.length === 0) {
    const only = sources.length === 1 ? sources[0] : undefined;
    throw new ResizeError(
      only
        ? `${only.name} could not be resized. ${failReason(only)}`
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
  return { bytes, name: RESIZE_ZIP_NAME, mime: 'application/zip', items, skipped };
}
