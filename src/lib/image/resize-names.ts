// Sizes, crop maths and names for the Resize and crop page. Kept free of any
// heavy imports so the page bundle stays light.

export interface SizePreset {
  id: string;
  label: string;
  /** What the size is for, in a few words. */
  hint: string;
  width: number;
  height: number;
}

/** Common sizes people need. Passport sizes are at 300 dpi, what photo kiosks print. */
export const PRESETS: readonly SizePreset[] = [
  { id: 'passport', label: 'Passport', hint: '35 × 45 mm, UK, EU, India', width: 413, height: 531 },
  {
    id: 'us-passport',
    label: 'US passport',
    hint: '2 × 2 in, also US visas',
    width: 600,
    height: 600,
  },
  { id: 'ig-square', label: 'Instagram post', hint: 'Square feed post', width: 1080, height: 1080 },
  {
    id: 'ig-portrait',
    label: 'Instagram portrait',
    hint: 'Tall feed post',
    width: 1080,
    height: 1350,
  },
  { id: 'story', label: 'Story', hint: 'Instagram, WhatsApp, TikTok', width: 1080, height: 1920 },
  {
    id: 'linkedin-banner',
    label: 'LinkedIn banner',
    hint: 'Profile background',
    width: 1584,
    height: 396,
  },
  {
    id: 'profile',
    label: 'Profile photo',
    hint: 'LinkedIn, Slack, Teams',
    width: 400,
    height: 400,
  },
  { id: 'youtube', label: 'YouTube thumbnail', hint: 'Video cover', width: 1280, height: 720 },
];

export const CUSTOM = 'custom';

export const getPreset = (id: string) => PRESETS.find((p) => p.id === id);

/** Largest side the page lets people ask for. Bigger canvases fail on phones. */
export const MAX_SIDE = 8000;

/** Which part of the photo to keep: centre and zoom. 1 shows as much as the shape allows. */
export interface CropView {
  /** Centre of the kept area, as a share of the photo's width and height. */
  x: number;
  y: number;
  zoom: number;
}

export const MAX_ZOOM = 5;
export const CENTERED: CropView = { x: 0.5, y: 0.5, zoom: 1 };

/** A rectangle as shares (0 to 1) of the photo, so any copy of it can be cut the same way. */
export interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Size of the kept area as a share of the photo, for a frame of `aspect`
 * (width / height). At zoom 1 it is the biggest such area that fits.
 */
function cropShare(srcW: number, srcH: number, aspect: number, zoom: number) {
  const photo = srcW / srcH;
  const z = clamp(zoom, 1, MAX_ZOOM);
  // Wider photo than frame: full height, part of the width. Taller: the other way round.
  const w = photo > aspect ? aspect / photo : 1;
  const h = photo > aspect ? 1 : photo / aspect;
  return { w: w / z, h: h / z };
}

/** The view moved back inside the photo, with zoom in range. */
export function clampView(srcW: number, srcH: number, aspect: number, view: CropView): CropView {
  const zoom = clamp(Number.isFinite(view.zoom) ? view.zoom : 1, 1, MAX_ZOOM);
  const { w, h } = cropShare(srcW, srcH, aspect, zoom);
  return {
    zoom,
    x: clamp(Number.isFinite(view.x) ? view.x : 0.5, w / 2, 1 - w / 2),
    y: clamp(Number.isFinite(view.y) ? view.y : 0.5, h / 2, 1 - h / 2),
  };
}

/** The area to keep, as shares of the photo. */
export function cropBox(srcW: number, srcH: number, aspect: number, view: CropView): CropBox {
  const v = clampView(srcW, srcH, aspect, view);
  const { w, h } = cropShare(srcW, srcH, aspect, v.zoom);
  return { x: v.x - w / 2, y: v.y - h / 2, width: w, height: h };
}

/** Height that keeps a photo's shape at `width`, at least 1. */
export const heightFor = (srcW: number, srcH: number, width: number) =>
  Math.max(1, Math.round((width * srcH) / srcW));

export const widthFor = (srcW: number, srcH: number, height: number) =>
  Math.max(1, Math.round((height * srcW) / srcH));

/**
 * The biggest size with the photo's own shape that fits inside `width` by
 * `height`. When `height` already follows the photo's shape it gives exactly
 * `width` by `height`.
 */
export function fitInside(srcW: number, srcH: number, width: number, height: number) {
  const h = heightFor(srcW, srcH, width);
  if (h <= height) return { width, height: h };
  return { width: Math.min(width, widthFor(srcW, srcH, height)), height };
}

/** A whole number of pixels between 1 and MAX_SIDE, or null for anything else. */
export function parseSide(text: string): number | null {
  if (!/^\s*\d+\s*$/.test(text)) return null;
  const n = Number(text);
  return n >= 1 && n <= MAX_SIDE ? n : null;
}

/**
 * How much the kept area gets stretched to reach the output size. Above 1
 * the result is enlarged and looks softer.
 */
export function enlargement(srcW: number, srcH: number, box: CropBox, outW: number, outH: number) {
  return Math.max(outW / (box.width * srcW), outH / (box.height * srcH));
}

/** JPG and HEIC photos come back as JPG, PNG and WebP keep their type, the rest PNG. */
export function resizeOutputType(file: { name: string; type: string }): string {
  if (/\.(jpe?g|jfif|hei[cf])$/i.test(file.name) || /^image\/(jpe?g|hei[cf])/i.test(file.type))
    return 'image/jpeg';
  if (/\.webp$/i.test(file.name) || file.type === 'image/webp') return 'image/webp';
  return 'image/png';
}

const EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

/** "beach.HEIC" at 1080 by 1350 as JPG -> "beach-1080x1350.jpg". */
export function resizedName(name: string, width: number, height: number, type: string): string {
  const base = name.replace(/\.[^./\\]+$/, '').trim() || 'photo';
  return `${base}-${width}x${height}${EXT[type] ?? '.png'}`;
}

/** "4:5", "16:9", or "3.96:1" when there is no small whole-number ratio. */
export function ratioLabel(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const g = gcd(width, height);
  const [a, b] = [width / g, height / g];
  if (a <= 32 && b <= 32) return `${a}:${b}`;
  return width >= height ? `${(width / height).toFixed(2)}:1` : `1:${(height / width).toFixed(2)}`;
}
