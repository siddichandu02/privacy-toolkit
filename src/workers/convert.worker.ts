/// <reference lib="webworker" />
import { convertImages, ConvertError, type ConvertSource } from '../lib/image/convert';
import { canvasEncode } from './canvas-encode';
import type { ConvertReply, ConvertWorkerRequest } from './convert-protocol';
import { unexpectedMessage } from './fail';

const post = (msg: ConvertReply, transfer: Transferable[] = []) =>
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(msg, transfer);

self.onmessage = async (event: MessageEvent<ConvertWorkerRequest>) => {
  const { files, settings, sizes = [], undecoded = [] } = event.data;
  try {
    const sources: ConvertSource[] = [];
    for (const [i, file] of files.entries()) {
      sources.push({
        name: file.name,
        type: file.type,
        bytes: await file.arrayBuffer(),
        size: sizes[i] ?? file.size,
        undecoded: undecoded.includes(i),
      });
    }
    const result = await convertImages(sources, settings, canvasEncode, (p) =>
      post({ type: 'progress', ...p }),
    );
    post({ type: 'done', ...result }, [result.bytes.buffer]);
  } catch (err) {
    const known = err instanceof ConvertError;
    post({
      type: 'error',
      message: known
        ? err.message
        : unexpectedMessage(err, 'Something went wrong while converting your photos. Try again.'),
      fileName: known ? err.fileName : undefined,
    });
  }
};
