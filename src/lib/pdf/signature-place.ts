/**
 * Where the signature sits, as fractions of the page as it is shown (after
 * its own rotation), measured from the top left. Height follows from the
 * signature's shape, so only the width is stored.
 */
export interface Placement {
  x: number;
  y: number;
  w: number;
}

/**
 * Keep a placement on the page, with the signature at a sensible size.
 * `shownAspect` is the shown page's width divided by its height.
 */
export function clampPlacement(place: Placement, aspect: number, shownAspect: number): Placement {
  const tall = Math.max(aspect * shownAspect, 1e-6);
  const w = Math.min(1, 1 / tall, Math.max(0.05, place.w));
  // Height as a fraction of the shown page height.
  const h = w * tall;
  const x = Math.min(1 - w, Math.max(0, place.x));
  const y = Math.min(1 - h, Math.max(0, place.y));
  return { x, y, w };
}
