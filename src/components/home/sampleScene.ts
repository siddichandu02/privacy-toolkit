/**
 * Paints the sample picture for the compression demo: a paper-cut evening
 * landscape with stars, folded hills and a little grain. It is drawn in the
 * browser, so the demo needs no image file and the same picture comes out
 * every time (seeded random). Fine detail and soft gradients are on purpose:
 * they are exactly where heavy compression starts to show.
 */

export const SCENE_WIDTH = 720;
export const SCENE_HEIGHT = 450;

/** Small seeded random number generator (mulberry32). */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hill(
  ctx: CanvasRenderingContext2D,
  rand: () => number,
  base: number,
  height: number,
  light: string,
  shade: string,
) {
  const w = SCENE_WIDTH;
  const peaks: [number, number][] = [[-40, base]];
  for (let x = 0; x <= w + 80; x += 90 + rand() * 70) {
    peaks.push([x, base - height * (0.45 + rand() * 0.55)]);
  }
  peaks.push([w + 40, base]);
  // Each facet is a folded paper triangle: lit on the left, in shade on the right.
  for (let i = 1; i < peaks.length - 1; i++) {
    const [px, py] = peaks[i] as [number, number];
    const [lx] = peaks[i - 1] as [number, number];
    const [rx] = peaks[i + 1] as [number, number];
    const left = (lx + px) / 2;
    const right = (px + rx) / 2;
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.moveTo(left - 30, SCENE_HEIGHT);
    ctx.lineTo(left - 30, base);
    ctx.lineTo(px, py);
    ctx.lineTo(px, SCENE_HEIGHT);
    ctx.fill();
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.moveTo(px, SCENE_HEIGHT);
    ctx.lineTo(px, py);
    ctx.lineTo(right + 30, base);
    ctx.lineTo(right + 30, SCENE_HEIGHT);
    ctx.fill();
  }
}

export function paintScene(ctx: CanvasRenderingContext2D) {
  const rand = seeded(7);
  const w = SCENE_WIDTH;
  const h = SCENE_HEIGHT;

  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.75);
  sky.addColorStop(0, '#1d1650');
  sky.addColorStop(0.55, '#6b3fa8');
  sky.addColorStop(1, '#ff8f7a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Stars: tiny sharp dots, the first thing heavy compression smudges.
  for (let i = 0; i < 260; i++) {
    const x = rand() * w;
    const y = rand() * h * 0.5;
    const r = rand() * 1.3 + 0.3;
    ctx.fillStyle = `rgba(255, 250, 235, ${0.35 + rand() * 0.65})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // A low sun with soft rings.
  const sun = ctx.createRadialGradient(520, 250, 10, 520, 250, 150);
  sun.addColorStop(0, 'rgba(255, 222, 140, 1)');
  sun.addColorStop(0.3, 'rgba(255, 200, 87, 0.9)');
  sun.addColorStop(1, 'rgba(255, 140, 120, 0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ffe39e';
  ctx.beginPath();
  ctx.arc(520, 250, 46, 0, Math.PI * 2);
  ctx.fill();

  hill(ctx, rand, 330, 120, '#8f4fb8', '#6a3593');
  hill(ctx, rand, 390, 110, '#5b3aa6', '#3f2780');
  hill(ctx, rand, 450, 90, '#2b2370', '#1b1650');

  // Paper grain over everything.
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * 18;
    d[i] = (d[i] ?? 0) + n;
    d[i + 1] = (d[i + 1] ?? 0) + n;
    d[i + 2] = (d[i + 2] ?? 0) + n;
  }
  ctx.putImageData(img, 0, 0);

  // A caption in fine type, so you can watch the edges go soft.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = '600 15px "Plus Jakarta Sans Variable", system-ui, sans-serif';
  ctx.fillText('Evening over the paper hills', 24, h - 24);
}
