import { NO_DETAILS, summarizeDetails, type PhotoDetails } from './exif-details';

type Parse = (input: ArrayBuffer | Uint8Array, options: object) => Promise<Record<string, unknown>>;

let loading: Promise<Parse> | null = null;

/** exifr is loaded from this site the first time a photo is read. */
function parser(): Promise<Parse> {
  loading ??= import('exifr').then((m) => m.default.parse as unknown as Parse);
  loading.catch(() => {
    loading = null;
  });
  return loading;
}

/** Start fetching the reader early, so reading works offline once files are added. */
export function prefetchExifReader() {
  parser().catch(() => {
    // Reading tries again and reports it.
  });
}

const OPTIONS = {
  tiff: true,
  exif: true,
  gps: true,
  xmp: true,
  iptc: true,
  icc: false,
  jfif: false,
  ihdr: false,
  interop: false,
  // Keep values as written, so dates stay in the camera's own clock.
  reviveValues: false,
  translateValues: false,
  mergeOutput: true,
};

/**
 * Read what is hidden in a photo. Any type exifr knows works: JPEG, PNG,
 * WebP, HEIC, AVIF, TIFF. A photo with nothing, or that cannot be read,
 * gives empty details rather than an error.
 */
export async function readPhotoDetails(
  bytes: ArrayBuffer | Uint8Array,
  parse?: Parse,
): Promise<PhotoDetails> {
  try {
    const run = parse ?? (await parser());
    const raw = await run(bytes, OPTIONS);
    return summarizeDetails(raw);
  } catch {
    return NO_DETAILS;
  }
}
