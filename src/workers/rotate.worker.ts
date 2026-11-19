/// <reference lib="webworker" />
import { RotateError, rotatePdf } from '../lib/pdf/rotate';
import type { RotateReply, RotateWorkerRequest } from './rotate-protocol';

const post = (msg: RotateReply, transfer: Transferable[] = []) =>
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(msg, transfer);

self.onmessage = async (event: MessageEvent<RotateWorkerRequest>) => {
  const { file, edits } = event.data;
  try {
    const result = await rotatePdf(
      { name: file.name, bytes: await file.arrayBuffer(), edits },
      (p) => post({ type: 'progress', ...p }),
    );
    post({ type: 'done', ...result }, [result.bytes.buffer]);
  } catch (err) {
    post({
      type: 'error',
      message:
        err instanceof RotateError
          ? err.message
          : 'Something went wrong while saving your pages. Try again.',
      fileName: file.name,
    });
  }
};
