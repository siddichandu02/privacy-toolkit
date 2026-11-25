/// <reference lib="webworker" />
import {
  compressImages,
  ImageCompressError,
  outputType,
  type CompressSource,
} from '../lib/image/compress';
import type {
  ImageCompressReply,
  ImageCompressWorkerRequest,
  ImagePreviewReply,
  ImagePreviewRequest,
} from './image-compress-protocol';
import { canvasEncode as encode } from './canvas-encode';
import { unexpectedMessage } from './fail';

const post = (msg: ImageCompressReply | ImagePreviewReply, transfer: Transferable[] = []) =>
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(msg, transfer);

async function preview({ id, file, settings, sourceType }: ImagePreviewRequest) {
  try {
    const out = await encode(
      { name: file.name, type: file.type, bytes: await file.arrayBuffer() },
      {
        type: outputType(sourceType ?? file.type, settings.format),
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
  const { files, settings, sizes = [] } = data;
  try {
    const sources: CompressSource[] = [];
    for (const [i, file] of files.entries()) {
      sources.push({
        name: file.name,
        type: file.type,
        bytes: await file.arrayBuffer(),
        size: sizes[i] ?? file.size,
      });
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
