/** A point on the pad in CSS pixels, with the time it was drawn. */
export interface InkPoint {
  x: number;
  y: number;
  t: number;
}

export type Stroke = InkPoint[];

export interface Signature {
  /** Transparent PNG, trimmed to the ink. */
  blob: Blob;
  /** Height divided by width. */
  aspect: number;
}

/** Inks people actually sign with. */
export const INKS = [
  { id: 'black', label: 'Black ink', color: '#16132b' },
  { id: 'blue', label: 'Blue ink', color: '#1d46c8' },
  { id: 'violet', label: 'Violet ink', color: '#5a34d1' },
] as const;

export type InkId = (typeof INKS)[number]['id'];

export const inkColor = (id: InkId) => INKS.find((i) => i.id === id)?.color ?? INKS[0].color;

/** Script faces for typed signatures, self-hosted with the rest of the fonts. */
export const HANDS = [
  { id: 'flowing', label: 'Flowing', family: '"Great Vibes"' },
  { id: 'casual', label: 'Casual', family: '"Caveat Variable"' },
] as const;

export type HandId = (typeof HANDS)[number]['id'];

export const handFamily = (id: HandId) => HANDS.find((h) => h.id === id)?.family ?? HANDS[0].family;

/**
 * Line width for each segment of a stroke: quick movements thin out a little
 * and slow ones swell, like a real pen. Widths ease from one to the next so
 * the line never jumps.
 */
export function strokeWidths(stroke: Stroke, base: number): number[] {
  const out: number[] = [];
  let last = base;
  for (let i = 1; i < stroke.length; i++) {
    const a = stroke[i - 1] as InkPoint;
    const b = stroke[i] as InkPoint;
    const dt = Math.max(1, b.t - a.t);
    const speed = Math.hypot(b.x - a.x, b.y - a.y) / dt; // px per ms
    const target = base * Math.min(1.35, Math.max(0.55, 1.35 - speed * 0.35));
    last = last + (target - last) * 0.4;
    out.push(last);
  }
  return out;
}

/** Draw strokes with smooth curves through the midpoints. */
export function drawStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: readonly Stroke[],
  color: string,
  base: number,
) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const stroke of strokes) {
    const first = stroke[0];
    if (!first) continue;
    if (stroke.length === 1) {
      ctx.beginPath();
      ctx.arc(first.x, first.y, base * 0.6, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    const widths = strokeWidths(stroke, base);
    let from = { x: first.x, y: first.y };
    for (let i = 1; i < stroke.length; i++) {
      const p = stroke[i] as InkPoint;
      const next = stroke[i + 1];
      const to = next ? { x: (p.x + next.x) / 2, y: (p.y + next.y) / 2 } : { x: p.x, y: p.y };
      ctx.beginPath();
      ctx.lineWidth = widths[i - 1] ?? base;
      ctx.moveTo(from.x, from.y);
      ctx.quadraticCurveTo(p.x, p.y, to.x, to.y);
      ctx.stroke();
      from = to;
    }
  }
}

export type PadMode = 'draw' | 'type';

/** Everything on the signature pad, kept by the page so it survives a trip to the done screen. */
export interface SignatureDraft {
  mode: PadMode;
  ink: InkId;
  strokes: Stroke[];
  text: string;
  hand: HandId;
}

export const EMPTY_DRAFT: SignatureDraft = {
  mode: 'draw',
  ink: 'blue',
  strokes: [],
  text: '',
  hand: 'flowing',
};

export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The smallest box holding every pixel that is not see-through, or null. */
export function inkBounds({ data, width, height }: ImageData): Bounds | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if ((data[(y * width + x) * 4 + 3] ?? 0) > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** Cut a canvas down to its ink plus a little room, as a PNG. */
export function trimToSignature(canvas: HTMLCanvasElement): Promise<Signature | null> {
  const ctx = canvas.getContext('2d');
  if (!ctx || !canvas.width || !canvas.height) return Promise.resolve(null);
  const box = inkBounds(ctx.getImageData(0, 0, canvas.width, canvas.height));
  if (!box) return Promise.resolve(null);
  const pad = Math.round(Math.max(box.w, box.h) * 0.04) + 2;
  const out = document.createElement('canvas');
  out.width = box.w + pad * 2;
  out.height = box.h + pad * 2;
  out.getContext('2d')?.drawImage(canvas, box.x, box.y, box.w, box.h, pad, pad, box.w, box.h);
  const aspect = out.height / out.width;
  return new Promise((resolve) => {
    out.toBlob((blob) => resolve(blob ? { blob, aspect } : null), 'image/png');
  });
}

/** Strokes drawn on a pad, made into a signature image at `scale` times the size. */
export function signatureFromStrokes(
  strokes: readonly Stroke[],
  size: { width: number; height: number },
  color: string,
  base: number,
  scale = 3,
): Promise<Signature | null> {
  if (!strokes.some((s) => s.length)) return Promise.resolve(null);
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(size.width * scale);
  canvas.height = Math.ceil(size.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);
  ctx.scale(scale, scale);
  drawStrokes(ctx, strokes, color, base);
  return trimToSignature(canvas);
}

/** A typed name set in a script face, made into a signature image. */
export async function signatureFromText(
  text: string,
  family: string,
  color: string,
): Promise<Signature | null> {
  const name = text.trim();
  if (!name) return null;
  const px = 160;
  const font = `${px}px ${family}`;
  try {
    await document.fonts?.load(font, name);
  } catch {
    // Falls back to the browser's own cursive face.
  }
  const canvas = document.createElement('canvas');
  const measure = canvas.getContext('2d');
  if (!measure) return null;
  measure.font = font;
  const width = Math.ceil(measure.measureText(name).width + px);
  canvas.width = Math.min(width, 8000);
  canvas.height = Math.ceil(px * 1.8);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(name, px / 2, canvas.height / 2);
  return trimToSignature(canvas);
}
