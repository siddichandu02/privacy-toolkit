import type { Encoded, ImageEncoder, SourceImage } from './compress';
import { resizedName, type CropBox } from './resize-names';

export * from './resize-names';

export type ResizeStage = 'reading' | 'working' | 'packing';

/** What to make: the exact size, the part to keep (null keeps the whole photo) and the type. */
export interface ResizeSettings {
  width: number;
  height: number;
  crop: CropBox | null;
  type: string;
  /** 0.5 to 1, for JPG and WebP. */
  quality: number;
}

export interface ResizeSource extends SourceImage {
  /** Name and size of the file the person picked, before any HEIC decoding. */
  originalName?: string;
  size?: number;
}

export interface ResizeResult {
  bytes: Uint8Array;
  name: string;
  mime: string;
  width: number;
  height: number;
  /** Size of the photo it came from, upright. */
  sourceWidth: number;
  sourceHeight: number;
  before: number;
  after: number;
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

/** Cut and scale one photo to the chosen size. */
export async function resizeImage(
  source: ResizeSource,
  settings: ResizeSettings,
  encode: ImageEncoder,
  onProgress: (p: ResizeProgress) => void = () => {},
): Promise<ResizeResult> {
  const name = source.originalName ?? source.name;
  const { width, height } = settings;
  if (!(width >= 1 && height >= 1)) throw new ResizeError('Pick a size of at least 1 pixel.');
  onProgress({ stage: 'reading', progress: 0.1 });

  let encoded: Encoded;
  try {
    onProgress({ stage: 'working', progress: 0.3 });
    encoded = await encode(source, {
      type: settings.type,
      quality: settings.quality,
      maxEdge: null,
      crop: settings.crop ?? undefined,
      size: { width, height },
    });
  } catch {
    throw new ResizeError(
      `${name} could not be opened. It may be damaged or not really an image.`,
      name,
    );
  }
  onProgress({ stage: 'packing', progress: 0.9 });
  const result: ResizeResult = {
    bytes: encoded.bytes,
    name: resizedName(name, encoded.width, encoded.height, encoded.mime),
    mime: encoded.mime,
    width: encoded.width,
    height: encoded.height,
    sourceWidth: encoded.sourceWidth,
    sourceHeight: encoded.sourceHeight,
    before: source.size ?? source.bytes.byteLength,
    after: encoded.bytes.byteLength,
  };
  onProgress({ stage: 'packing', progress: 1 });
  return result;
}
