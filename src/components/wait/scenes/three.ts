let webgl: boolean | undefined;

/** Whether this browser can draw WebGL. Checked once and remembered. */
export function canUse3D(): boolean {
  if (webgl !== undefined) return webgl;
  try {
    // The test DOM has no canvas drawing at all.
    if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) {
      webgl = false;
    } else {
      const canvas = document.createElement('canvas');
      webgl = !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
    }
  } catch {
    webgl = false;
  }
  return webgl;
}

/**
 * The 3D helpers live in their own chunk (three.js is big). Tools call this
 * as soon as files are added so it is cached before the story plays, even if
 * the connection drops afterwards.
 */
export const loadHelpers3D = () => import('./Helpers3D');

export function prefetchHelpers3D() {
  if (canUse3D()) void loadHelpers3D().catch(() => {});
}
