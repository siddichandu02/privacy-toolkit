/// <reference lib="webworker" />
import {
  compressImages,
  fitEdge,
  ImageCompressError,
  outputType,
  type ImageEncoder,
} from '../lib/image/compress';
import type {
  ImageCompressReply,
  ImageCompressWorkerRequest,
  ImagePreviewReply,
  ImagePreviewRequest,
} from './image-compress-protocol';
import { unexpectedMessage } from './fail';

const post = (msg: ImageCompressReply | ImagePreviewReply, transfer: Transferable[] = []) =>
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(msg, transfer);

/**
 * Draw the photo upright (EXIF turn applied) at the chosen size and save it
 * again. Redrawing also leaves the camera details and location behind. JPEG
 * has no transparency, so see-through areas go on white.
 */
const encode: ImageEncoder = async (source, { type, quality, maxEdge }) => {
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

async function preview({ id, file, settings }: ImagePreviewRequest) {
  try {
    const out = await encode(
      { name: file.name, type: file.type, bytes: await file.arrayBuffer() },
      {
        type: outputType(file.type, settings.format),
        quality: settings.quality,
        maxEdge: settings.maxEdge,
      },
    );
    post({ type: 'preview', id, ...out }, [out.bytes.buffer]);
  } catch {
    post({ type: 'preview-error', id });
  }
}

self.onmessage = async (event: MessageEvent<ImageCompressWorkerRequest | ImagePreviewRequest>) => {
  const data = event.data;
  if (data.kind === 'preview') {
    await preview(data);
    return;
  }
  const { files, settings } = data;
  try {
    const sources = [];
    for (const file of files) {
      sources.push({ name: file.name, type: file.type, bytes: await file.arrayBuffer() });
    }
    const result = await compressImages(sources, settings, encode, (p) =>
      post({ type: 'progress', ...p }),
    );
    post({ type: 'done', ...result }, [result.bytes.buffer]);
  } catch (err) {
    const known = err instanceof ImageCompressError;
    post({
      type: 'error',
      message: known
        ? err.message
        : unexpectedMessage(err, 'Something went wrong while shrinking your photos. Try again.'),
      fileName: known ? err.fileName : undefined,
    });
  }
};
