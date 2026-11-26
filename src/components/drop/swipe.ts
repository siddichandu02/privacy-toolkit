/** How far (px) a slip has to be pulled left before letting go removes it. */
export const SWIPE_ARM = 96;
/** A quick flick (px/s) also removes it, once it has moved a little. */
export const SWIPE_FLICK = 700;

/** True when a left swipe on a slip of this width should remove it. */
export function swipeRemoves(offsetX: number, velocityX: number, width: number): boolean {
  const far = Math.min(SWIPE_ARM, width * 0.45);
  return offsetX <= -far || (offsetX < -32 && velocityX < -SWIPE_FLICK);
}
