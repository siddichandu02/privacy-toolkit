/// <reference lib="webworker" />
import { resizeImage, ResizeError } from '../lib/image/resize';
import { canvasEncode } from './canvas-encode';
import { unexpectedMessage } from './fail';
import type { ResizeReply, ResizeWorkerRequest } from './resize-protocol';

const post = (msg: ResizeReply, transfer: Transferable[] = []) =>
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(msg, transfer);

self.onmessage = async (event: MessageEvent<ResizeWorkerRequest>) => {
  const { file, settings, originalName, size } = event.data;
  try {
    const result = await resizeImage(
      {
        name: file.name,
        type: file.type,
        bytes: await file.arrayBuffer(),
        originalName,
        size: size ?? file.size,
      },
      settings,
      canvasEncode,
      (p) => post({ type: 'progress', ...p }),
    );
    post({ type: 'done', ...result }, [result.bytes.buffer]);
  } catch (err) {
    const known = err instanceof ResizeError;
    post({
      type: 'error',
      message: known
        ? err.message
        : unexpectedMessage(err, 'Something went wrong while resizing your photo. Try again.'),
      fileName: known ? err.fileName : undefined,
    });
  }
};
