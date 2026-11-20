/// <reference lib="webworker" />
import { CompressError, compressPdf, type ImageRecoder } from '../lib/pdf/compress';
import type { CompressReply, CompressWorkerRequest } from './compress-protocol';

const post = (msg: CompressReply, transfer: Transferable[] = []) =>
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(msg, transfer);

/** Long side no bigger than `maxEdge`, never upscaled. */
const fit = (w: number, h: number, maxEdge: number) => {
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
};

/**
 * Redraw a photo on an OffscreenCanvas at a capped size and save it as JPEG.
 * Pixels go on a white backdrop first, since JPEG has no transparency.
 */
const recode: ImageRecoder = async (image, { maxEdge, quality }) => {
  const source =
    image.kind === 'jpeg'
      ? await createImageBitmap(new Blob([image.bytes as BlobPart], { type: 'image/jpeg' }))
      : await createImageBitmap(
          new ImageData(image.rgba as Uint8ClampedArray<ArrayBuffer>, image.width, image.height),
        );
  const { width, height } = fit(source.width, source.height, maxEdge);
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    source.close();
    return null;
  }
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, width, height);
  source.close();
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
  return { bytes: new Uint8Array(await blob.arrayBuffer()), width, height };
};

self.onmessage = async (event: MessageEvent<CompressWorkerRequest>) => {
  const { file, level } = event.data;
  try {
    const result = await compressPdf(
      { name: file.name, bytes: await file.arrayBuffer(), level },
      recode,
      (p) => post({ type: 'progress', ...p }),
    );
    post({ type: 'done', ...result }, [result.bytes.buffer]);
  } catch (err) {
    post({
      type: 'error',
      message:
        err instanceof CompressError
          ? err.message
          : 'Something went wrong while shrinking your PDF. Try again.',
      fileName: file.name,
    });
  }
};
