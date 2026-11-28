/**
 * The background mesh as data: each blob is an ellipse (centre and radii as
 * fractions of the mesh box) fading from its colour to clear at `fade`.
 * Same numbers as the CSS fallback in index.css.
 */
export const MESH_BLOBS = [
  { x: 0.2, y: 0.25, rx: 0.4, ry: 0.35, rgb: '124, 92, 255', alpha: 0.45, fade: 0.7 },
  { x: 0.8, y: 0.2, rx: 0.35, ry: 0.3, rgb: '255, 107, 139', alpha: 0.28, fade: 0.7 },
  { x: 0.7, y: 0.8, rx: 0.4, ry: 0.35, rgb: '76, 201, 240', alpha: 0.22, fade: 0.7 },
  { x: 0.25, y: 0.85, rx: 0.3, ry: 0.25, rgb: '61, 220, 151', alpha: 0.16, fade: 0.7 },
] as const;

/** Small on purpose: the gradients are smooth, so the browser can stretch it for free. */
export const MESH_SIZE = 128;

const rgba = (rgb: string, a: number) => `rgba(${rgb}, ${a})`;

/**
 * Paints the mesh into a tiny canvas. A full-screen layer of four radial
 * gradients is slow to draw the first time on weak GPUs; a 128 px bitmap
 * scaled up looks the same and costs next to nothing. Returns false when
 * there is no 2D canvas, so the caller can keep the CSS gradients.
 */
export function paintMesh(canvas: HTMLCanvasElement): boolean {
  let ctx: CanvasRenderingContext2D | null;
  try {
    ctx = canvas.getContext('2d');
  } catch {
    return false;
  }
  if (!ctx) return false;
  const n = MESH_SIZE;
  canvas.width = n;
  canvas.height = n;
  ctx.clearRect(0, 0, n, n);
  for (const b of MESH_BLOBS) {
    // Draw a unit circle stretched into the blob's ellipse.
    ctx.setTransform(b.rx * n, 0, 0, b.ry * n, b.x * n, b.y * n);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, rgba(b.rgb, b.alpha));
    // Fade to the same colour at zero alpha, not black, so edges stay clean.
    g.addColorStop(b.fade, rgba(b.rgb, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-b.x / b.rx, -b.y / b.ry, 1 / b.rx, 1 / b.ry);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return true;
}
