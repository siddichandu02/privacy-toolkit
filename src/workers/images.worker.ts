/// <reference lib="webworker" />
import { ImagesError, imagesToPdf, type ImageDecoder } from '../lib/pdf/images';
import type { ImagesReply, ImagesWorkerRequest } from './images-protocol';
import { unexpectedMessage } from './fail';

const post = (msg: ImagesReply, transfer: Transferable[] = []) =>
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(msg, transfer);

/** True when any sampled pixel is see-through, so the image needs PNG to keep it. */
function hasAlpha(ctx: OffscreenCanvasRenderingContext2D, w: number, h: number) {
  const { data } = ctx.getImageData(0, 0, w, h);
  // Look at up to about 250k pixels; plenty to catch a transparent area.
  const step = Math.max(1, Math.floor(data.length / 4 / 250_000)) * 4;
  for (let i = 3; i < data.length; i += step) if ((data[i] as number) < 255) return true;
  return false;
}

/**
 * Draw the image upright (EXIF turn applied) on a canvas and save it as JPEG,
 * or PNG when it has transparency. GIFs give their first frame.
 */
const decode: ImageDecoder = async (bytes, type) => {
  const bitmap = await createImageBitmap(new Blob([bytes as BlobPart], { type }), {
    imageOrientation: 'from-image',
  });
  const { width, height } = bitmap;
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no canvas');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const png = type !== 'image/jpeg' && hasAlpha(ctx, width, height);
  const blob = await canvas.convertToBlob(
    png ? { type: 'image/png' } : { type: 'image/jpeg', quality: 0.92 },
  );
  return { kind: png ? 'png' : 'jpg', bytes: new Uint8Array(await blob.arrayBuffer()) };
};

self.onmessage = async (event: MessageEvent<ImagesWorkerRequest>) => {
  const { files, options } = event.data;
  try {
    const sources = [];
    for (const file of files) {
      sources.push({ name: file.name, type: file.type, bytes: await file.arrayBuffer() });
    }
    const result = await imagesToPdf(sources, options, decode, (p) =>
      post({ type: 'progress', ...p }),
    );
    post({ type: 'done', ...result }, [result.bytes.buffer]);
  } catch (err) {
    const known = err instanceof ImagesError;
    post({
      type: 'error',
      message: known
        ? err.message
        : unexpectedMessage(err, 'Something went wrong while making your PDF. Try again.'),
      fileName: known ? err.fileName : undefined,
    });
  }
};
