// Small helpers the Compress image page uses. Kept apart from the batch code
// (which pulls in JSZip) so the page bundle stays light.

import { isHeic } from './convert-names';

export type OutputFormat = 'same' | 'jpeg' | 'webp';

export interface ImageCompressSettings {
  /** 0.1 to 0.95. Ignored for PNG, which is always lossless. */
  quality: number;
  format: OutputFormat;
  /** Longest side in pixels, or null to keep the full size. */
  maxEdge: number | null;
}

export const DEFAULT_SETTINGS: ImageCompressSettings = {
  quality: 0.75,
  format: 'same',
  maxEdge: null,
};

const EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

/**
 * The type a photo is saved as. "Same" keeps JPG, PNG and WebP as they are;
 * HEIC (which browsers cannot write) becomes JPG, and anything else the
 * browser cannot write (GIF) becomes PNG.
 */
export function outputType(inputType: string, format: OutputFormat): string {
  if (format === 'jpeg') return 'image/jpeg';
  if (format === 'webp') return 'image/webp';
  if (/^image\/hei[cf]/i.test(inputType)) return 'image/jpeg';
  return inputType in EXT ? inputType : 'image/png';
}

/**
 * The type a picked photo really is. HEIC photos often come with no type at
 * all, and their decoded copies say PNG, so the name decides.
 */
export const sourceType = (file: { name: string; type: string }) =>
  isHeic(file) ? 'image/heic' : file.type;

/** True when quality has no effect on this output (PNG is lossless). */
export const ignoresQuality = (type: string) => type === 'image/png';

/** "beach.png" saved as WebP -> "beach-compressed.webp". */
export function compressedImageName(name: string, type: string): string {
  const base = name.replace(/\.[^./\\]+$/, '').trim() || 'photo';
  return `${base}-compressed${EXT[type] ?? '.png'}`;
}

/** Long side no bigger than `maxEdge`, never upscaled. */
export function fitEdge(width: number, height: number, maxEdge: number | null) {
  const scale = maxEdge ? Math.min(1, maxEdge / Math.max(width, height)) : 1;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Names unique within a ZIP: a second "a.jpg" becomes "a (2).jpg". */
export function uniqueNames(names: readonly string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const key = name.toLowerCase();
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    if (count === 1) return name;
    const dot = name.lastIndexOf('.');
    return dot > 0 ? `${name.slice(0, dot)} (${count})${name.slice(dot)}` : `${name} (${count})`;
  });
}
