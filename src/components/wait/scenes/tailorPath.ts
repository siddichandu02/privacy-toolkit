// Geometry for the tailor scene, kept apart so the scene file only exports components.

/*
 * Same coordinate space as Pip (left 160 of 300 units, full height). The
 * photo lies on a cutting mat on the tailor's table to Pip's right.
 */
export const PHOTO = { x: 194, y: 56, w: 94, h: 74 };
/** The pattern never fills the whole photo; there is always something to trim. */
const FILL = 0.8;

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The pattern: the biggest box of `aspect` that fits FILL of the photo, centred. */
export function patternBox(aspect: number): Box {
  const a = Number.isFinite(aspect) && aspect > 0 ? Math.min(6, Math.max(1 / 6, aspect)) : 1;
  const maxW = PHOTO.w * FILL;
  const maxH = PHOTO.h * FILL;
  const w = Math.min(maxW, maxH * a);
  const h = w / a;
  return { x: PHOTO.x + (PHOTO.w - w) / 2, y: PHOTO.y + (PHOTO.h - h) / 2, w, h };
}

/** Where the scissors are after cutting `share` of the way round, and which way they face. */
export function alongPattern(box: Box, share: number) {
  const s = Math.min(1, Math.max(0, share));
  const sides = [box.w, box.h, box.w, box.h];
  let d = s * 2 * (box.w + box.h);
  // Clockwise from the top left corner: top, right, bottom, left.
  const corners = [
    { x: box.x, y: box.y, dx: 1, dy: 0, angle: 0 },
    { x: box.x + box.w, y: box.y, dx: 0, dy: 1, angle: 90 },
    { x: box.x + box.w, y: box.y + box.h, dx: -1, dy: 0, angle: 180 },
    { x: box.x, y: box.y + box.h, dx: 0, dy: -1, angle: 270 },
  ];
  for (const [i, c] of corners.entries()) {
    const len = sides[i] as number;
    if (d <= len || i === 3) {
      const t = Math.min(d, len);
      return { x: c.x + c.dx * t, y: c.y + c.dy * t, angle: c.angle };
    }
    d -= len;
  }
  return { x: box.x, y: box.y, angle: 0 };
}
