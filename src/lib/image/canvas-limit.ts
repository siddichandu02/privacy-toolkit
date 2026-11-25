// Browsers refuse canvases past a certain size, and some fail without saying
// so (a blank picture or a rejected save). Photos are drawn no bigger than
// these limits, scaled down evenly when needed.

/** Longest side any current browser will draw. */
export const MAX_CANVAS_SIDE = 16_384;
/** Safari on iPhone and iPad stops at 4096 x 4096 worth of pixels. */
export const WEBKIT_CANVAS_AREA = 16_777_216;
/** Chrome allows about 268 million pixels and Firefox about 125 million; stay under both. */
export const DESKTOP_CANVAS_AREA = 120_000_000;

/**
 * True for Safari's engine: every browser on iPhone and iPad, and Safari on a
 * Mac (iPads ask for the desktop site, so they look like a Mac here too).
 */
export function isWebKitOnly(userAgent: string): boolean {
  if (/iPhone|iPad|iPod/.test(userAgent)) return true;
  return (
    /Safari\//.test(userAgent) &&
    !/Chrome|Chromium|CriOS|Edg|OPR|Firefox|FxiOS|Android/.test(userAgent)
  );
}

/** Most pixels a canvas may hold in this browser. */
export const canvasAreaFor = (userAgent: string) =>
  isWebKitOnly(userAgent) ? WEBKIT_CANVAS_AREA : DESKTOP_CANVAS_AREA;

/**
 * The asked size, scaled down evenly until it fits the limits. `shrunk` says
 * whether it had to be.
 */
export function fitCanvas(
  width: number,
  height: number,
  maxArea: number,
  maxSide = MAX_CANVAS_SIDE,
): { width: number; height: number; shrunk: boolean } {
  const scale = Math.min(
    1,
    maxSide / Math.max(width, height),
    Math.sqrt(maxArea / (width * height)),
  );
  if (scale >= 1) return { width, height, shrunk: false };
  // Round down so the result never creeps back over the limit.
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
    shrunk: true,
  };
}
