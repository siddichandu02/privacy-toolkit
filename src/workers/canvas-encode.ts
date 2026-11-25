/// <reference lib="webworker" />
import type { ImageEncoder } from '../lib/image/compress';
import { fitEdge } from '../lib/image/compress-names';
import { canvasAreaFor, fitCanvas } from '../lib/image/canvas-limit';

const MAX_AREA = canvasAreaFor(self.navigator.userAgent);

/**
 * Draw the photo upright (EXIF turn applied), cropped if asked, at the chosen size and save it
 * again. Redrawing also leaves the camera details and location behind. JPEG
 * has no transparency, so see-through areas go on white. Runs in a worker.
 */
export const canvasEncode: ImageEncoder = async (
  source,
  { type, quality, maxEdge, crop: askedCrop, size: askedSize, fit },
) => {
  const bitmap = await createImageBitmap(new Blob([source.bytes], { type: source.type }), {
    imageOrientation: 'from-image',
  });
  const fitted = fit?.(bitmap.width, bitmap.height);
  const crop = fitted ? fitted.crop : askedCrop;
  const size = fitted ? fitted.size : askedSize;
  // The part of the photo to draw, in its own pixels.
  const sx = crop ? crop.x * bitmap.width : 0;
  const sy = crop ? crop.y * bitmap.height : 0;
  const sw = crop ? Math.max(1, crop.width * bitmap.width) : bitmap.width;
  const sh = crop ? Math.max(1, crop.height * bitmap.height) : bitmap.height;
  const asked = size ?? fitEdge(sw, sh, maxEdge);
  // Too big for this browser's canvas: draw it as large as it allows instead of failing.
  const { width, height, shrunk } = fitCanvas(asked.width, asked.height, MAX_AREA);
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('no canvas');
  }
  if (type === 'image/jpeg') {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
  }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height);
  const sourceWidth = bitmap.width;
  const sourceHeight = bitmap.height;
  bitmap.close();
  const blob = await canvas.convertToBlob({ type, quality });
  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    mime: blob.type || type,
    width,
    height,
    sourceWidth,
    sourceHeight,
    shrunk,
  };
};
