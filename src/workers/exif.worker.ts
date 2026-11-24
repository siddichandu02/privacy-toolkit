/// <reference lib="webworker" />
import type { ConvertSource } from '../lib/image/convert';
import { cleanImages, CleanError } from '../lib/image/exif-clean';
import { canvasEncode } from './canvas-encode';
import type { ExifReply, ExifWorkerRequest } from './exif-protocol';
import { unexpectedMessage } from './fail';

const post = (msg: ExifReply, transfer: Transferable[] = []) =>
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(msg, transfer);

self.onmessage = async (event: MessageEvent<ExifWorkerRequest>) => {
  const { files, sizes = [], undecoded = [] } = event.data;
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
    const result = await cleanImages(sources, canvasEncode, (p) =>
      post({ type: 'progress', ...p }),
    );
    post({ type: 'done', ...result }, [result.bytes.buffer]);
  } catch (err) {
    const known = err instanceof CleanError;
    post({
      type: 'error',
      message: known
        ? err.message
        : unexpectedMessage(err, 'Something went wrong while cleaning your photos. Try again.'),
      fileName: known ? err.fileName : undefined,
    });
  }
};
