/// <reference lib="webworker" />
import type { ImageEncoder } from '../lib/image/compress';
import { fitEdge } from '../lib/image/compress-names';

/**
 * Draw the photo upright (EXIF turn applied) at the chosen size and save it
 * again. Redrawing also leaves the camera details and location behind. JPEG
 * has no transparency, so see-through areas go on white. Runs in a worker.
 */
export const canvasEncode: ImageEncoder = async (source, { type, quality, maxEdge }) => {
  const bitmap = await createImageBitmap(new Blob([source.bytes], { type: source.type }), {
    imageOrientation: 'from-image',
  });
  const { width, height } = fitEdge(bitmap.width, bitmap.height, maxEdge);
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
  ctx.drawImage(bitmap, 0, 0, width, height);
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
  };
};
