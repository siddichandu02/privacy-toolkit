import JSZip from 'jszip';
import type { Encoded, ImageEncoder, SkippedImage, SourceImage } from './compress';
import { uniqueNames } from './compress-names';
import { convertedName, isHeic, TARGET_TYPE, type ConvertSettings } from './convert-names';

export * from './convert-names';

export type ConvertStage = 'reading' | 'working' | 'packing';

/** A photo ready to draw. HEIC photos arrive already decoded, under their own name. */
export interface ConvertSource extends SourceImage {
  /** Size of the file the person picked, before any decoding. */
  size?: number;
  /** The HEIC photo could not be decoded before it got here. */
  undecoded?: boolean;
}

export interface ConvertedImage {
  name: string;
  /** The type it came in as. */
  from: string;
  type: string;
  before: number;
  after: number;
}

export interface ConvertResult {
  /** One photo, or a ZIP when there are several. */
  bytes: Uint8Array;
  name: string;
  mime: string;
  items: ConvertedImage[];
  skipped: SkippedImage[];
  /** The browser could not write the chosen type and saved PNG instead. */
  fellBack: boolean;
}

export interface ConvertProgress {
  stage: ConvertStage;
  progress: number;
}

export class ConvertError extends Error {
  constructor(
    message: string,
    readonly fileName?: string,
  ) {
    super(message);
    this.name = 'ConvertError';
  }
}

export const CONVERT_ZIP_NAME = 'converted-photos.zip';

/** Plain reason a photo could not be converted. */
export function convertFailReason(source: ConvertSource): string {
  return isHeic(source)
    ? 'This HEIC photo could not be read. It may be damaged, or use a variant this browser cannot decode.'
    : 'It could not be opened. It may be damaged or not really an image.';
}

/**
 * Save every photo in the chosen format. A photo that cannot be opened is
 * skipped and named, so one bad file never sinks the batch. Several photos
 * come back in one ZIP.
 */
export async function convertImages(
  sources: readonly ConvertSource[],
  settings: ConvertSettings,
  encode: ImageEncoder,
  onProgress: (p: ConvertProgress) => void = () => {},
): Promise<ConvertResult> {
  if (sources.length === 0) throw new ConvertError('Add at least one photo.');
  onProgress({ stage: 'reading', progress: 0.05 });

  const type = TARGET_TYPE[settings.to];
  const done: { item: ConvertedImage; bytes: Uint8Array }[] = [];
  const skipped: SkippedImage[] = [];
  let fellBack = false;

  for (const [i, source] of sources.entries()) {
    let encoded: Encoded | null = null;
    if (!source.undecoded) {
      try {
        encoded = await encode(source, { type, quality: settings.quality, maxEdge: null });
      } catch {
        encoded = null;
      }
    }
    if (encoded) {
      if (encoded.mime !== type) fellBack = true;
      done.push({
        item: {
          name: convertedName(source.name, encoded.mime),
          from: source.type,
          type: encoded.mime,
          before: source.size ?? source.bytes.byteLength,
          after: encoded.bytes.byteLength,
        },
        bytes: encoded.bytes,
      });
    } else {
      skipped.push({ name: source.name, reason: convertFailReason(source) });
    }
    onProgress({ stage: 'working', progress: 0.1 + (0.75 * (i + 1)) / sources.length });
  }

  if (done.length === 0) {
    const only = sources.length === 1 ? sources[0] : undefined;
    throw new ConvertError(
      only
        ? `${only.name} could not be converted. ${convertFailReason(only)}`
        : 'None of these photos could be opened. They may be damaged or not really images.',
      only?.name,
    );
  }

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
      fellBack,
    };
  }

  onProgress({ stage: 'packing', progress: 0.9 });
  const zip = new JSZip();
  const names = uniqueNames(items.map((i) => i.name));
  done.forEach((d, i) => zip.file(names[i] as string, d.bytes, { compression: 'STORE' }));
  const bytes = await zip.generateAsync({ type: 'uint8array' });
  onProgress({ stage: 'packing', progress: 1 });
  return { bytes, name: CONVERT_ZIP_NAME, mime: 'application/zip', items, skipped, fellBack };
}
