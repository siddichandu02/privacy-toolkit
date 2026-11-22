/** How far (px) a card leans toward the pointer at most, and how near it has to be. */
const PULL = 6;
const REACH = 200;

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Where the pointer is relative to one card, and how much the card leans
 * toward it: full lean when the pointer is on the card, fading to nothing
 * REACH px away from its edge.
 */
export function spotFor(box: Box, x: number, y: number) {
  const sx = x - box.left;
  const sy = y - box.top;
  const cx = box.left + box.width / 2;
  const cy = box.top + box.height / 2;
  // Distance from the pointer to the card's edge (0 when inside).
  const gapX = Math.max(0, Math.abs(x - cx) - box.width / 2);
  const gapY = Math.max(0, Math.abs(y - cy) - box.height / 2);
  const near = Math.max(0, 1 - Math.hypot(gapX, gapY) / REACH);
  const nx = Math.max(-1, Math.min(1, (x - cx) / (box.width / 2 + REACH)));
  const ny = Math.max(-1, Math.min(1, (y - cy) / (box.height / 2 + REACH)));
  return {
    sx,
    sy,
    pullX: +(nx * near * PULL).toFixed(2),
    pullY: +(ny * near * PULL).toFixed(2),
  };
}
