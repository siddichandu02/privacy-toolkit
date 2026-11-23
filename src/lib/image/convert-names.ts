// Small helpers the Convert image page uses. Kept apart from the batch code
// (which pulls in JSZip) so the page bundle stays light.

export type ConvertTarget = 'jpeg' | 'png' | 'webp';

export interface ConvertSettings {
  to: ConvertTarget;
  /** 0.5 to 1. Only JPG and WebP use it; PNG is always lossless. */
  quality: number;
}

export const DEFAULT_CONVERT: ConvertSettings = { to: 'jpeg', quality: 0.9 };

export const TARGET_TYPE: Record<ConvertTarget, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

/** "IMG_0042.HEIC" as JPG -> "IMG_0042.jpg". */
export function convertedName(name: string, type: string): string {
  const base = name.replace(/\.[^./\\]+$/, '').trim() || 'photo';
  return `${base}${EXT[type] ?? '.png'}`;
}

interface Named {
  name: string;
  type: string;
}

/** HEIC and HEIF photos, from iPhones. Windows often leaves the type empty. */
export const isHeic = ({ name, type }: Named) =>
  /\.hei[cf]$/i.test(name) || /^image\/hei[cf]/i.test(type);

const LABELS: [RegExp, string][] = [
  [/\.(jpe?g|jfif)$|^image\/jpe?g$/i, 'JPG'],
  [/\.png$|^image\/png$/i, 'PNG'],
  [/\.webp$|^image\/webp$/i, 'WebP'],
  [/\.gif$|^image\/gif$/i, 'GIF'],
  [/\.avif$|^image\/avif$/i, 'AVIF'],
  [/\.bmp$|^image\/bmp$/i, 'BMP'],
];

/** Short name of a photo's format, as people know it: "HEIC", "JPG", "WebP". */
export function formatLabel(file: Named): string {
  if (isHeic(file)) return 'HEIC';
  for (const [test, label] of LABELS) {
    if (test.test(file.name) || test.test(file.type)) return label;
  }
  return 'Image';
}

export const targetLabel = (to: ConvertTarget) =>
  to === 'jpeg' ? 'JPG' : to === 'png' ? 'PNG' : 'WebP';

/** "3 HEIC, 1 PNG": what is in the pile, biggest group first. */
export function formatMix(files: readonly Named[]): string {
  const counts = new Map<string, number>();
  for (const f of files) {
    const label = formatLabel(f);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, n]) => `${n} ${label}`)
    .join(', ');
}
