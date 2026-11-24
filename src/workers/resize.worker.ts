/// <reference lib="webworker" />
import { resizeImages, ResizeError, type ResizeSource } from '../lib/image/resize';
import { canvasEncode } from './canvas-encode';
import { unexpectedMessage } from './fail';
import type { ResizeReply, ResizeWorkerRequest } from './resize-protocol';

const post = (msg: ResizeReply, transfer: Transferable[] = []) =>
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(msg, transfer);

self.onmessage = async (event: MessageEvent<ResizeWorkerRequest>) => {
  const { files, settings, sizes = [], undecoded = [] } = event.data;
  try {
    const sources: ResizeSource[] = [];
    for (const [i, file] of files.entries()) {
      sources.push({
        name: file.name,
        type: file.type,
        bytes: await file.arrayBuffer(),
        size: sizes[i] ?? file.size,
        undecoded: undecoded.includes(i),
      });
    }
    const result = await resizeImages(sources, settings, canvasEncode, (p) =>
      post({ type: 'progress', ...p }),
    );
    post({ type: 'done', ...result }, [result.bytes.buffer]);
  } catch (err) {
    const known = err instanceof ResizeError;
    post({
      type: 'error',
      message: known
        ? err.message
        : unexpectedMessage(err, 'Something went wrong while resizing your photos. Try again.'),
      fileName: known ? err.fileName : undefined,
    });
  }
};
