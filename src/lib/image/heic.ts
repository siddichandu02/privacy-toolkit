import { isHeic } from './convert-names';

/** heic2any's call shape; it is loaded only when a HEIC photo shows up. */
type Heic2Any = (options: {
  blob: Blob;
  toType?: string;
  quality?: number;
  multiple?: boolean;
}) => Promise<Blob | Blob[]>;

let loading: Promise<Heic2Any> | null = null;

/**
 * Loads the HEIC decoder (about 1.3 MB) from this site the first time it is
 * needed. It draws on a canvas, so it runs on the page, not in our workers;
 * it starts its own worker for the heavy part.
 */
function decoder(): Promise<Heic2Any> {
  loading ??= import('heic2any').then((m) => m.default as Heic2Any);
  loading.catch(() => {
    loading = null; // Let the next try load it again.
  });
  return loading;
}

/** Start fetching the decoder early, e.g. as soon as a HEIC photo is added. */
export function prefetchHeic() {
  decoder().catch(() => {
    // The real decode tries again and reports it.
  });
}

/** One HEIC photo as a lossless PNG, under the same name. Bursts give their first frame. */
export async function decodeHeic(file: File): Promise<File> {
  const heic2any = await decoder();
  const out = await heic2any({ blob: file, toType: 'image/png' });
  const blob = Array.isArray(out) ? out[0] : out;
  if (!blob) throw new Error('empty HEIC');
  return new File([blob], file.name, { type: 'image/png', lastModified: file.lastModified });
}

const decodedCopies = new WeakMap<File, Promise<File>>();

/**
 * `decodeHeic`, but each picked file is decoded only once per visit, so a
 * photo opened for the preview is not decoded again when the job starts.
 * A failed decode is forgotten so the next try runs again.
 */
export function decodeHeicOnce(
  file: File,
  decode: (file: File) => Promise<File> = decodeHeic,
): Promise<File> {
  let copy = decodedCopies.get(file);
  if (!copy) {
    copy = decode(file);
    decodedCopies.set(file, copy);
    copy.catch(() => decodedCopies.delete(file));
  }
  return copy;
}

export interface PreparedFiles {
  /** Every file in order: HEIC photos swapped for PNG copies, others as they were. */
  files: File[];
  /** Original sizes, in the same order, so results can compare with what was picked. */
  sizes: number[];
  /** Positions of HEIC photos that could not be decoded. They stay in `files` untouched. */
  undecoded: number[];
}

/**
 * Turn any HEIC photos into something the browser can draw. `decode` is
 * injectable for tests. Progress runs 0 to 1 over the HEIC photos only.
 */
export async function prepareImages(
  files: readonly File[],
  onProgress: (share: number) => void = () => {},
  decode: (file: File) => Promise<File> = (file) => decodeHeicOnce(file),
): Promise<PreparedFiles> {
  const heics = files.filter(isHeic).length;
  let decoded = 0;
  const undecoded: number[] = [];
  const out: File[] = [];
  for (const [i, file] of files.entries()) {
    if (!isHeic(file)) {
      out.push(file);
      continue;
    }
    try {
      out.push(await decode(file));
    } catch {
      undecoded.push(i);
      out.push(file);
    }
    decoded += 1;
    onProgress(decoded / heics);
  }
  return { files: out, sizes: files.map((f) => f.size), undecoded };
}

export const hasHeic = (files: readonly { name: string; type: string }[]) => files.some(isHeic);
