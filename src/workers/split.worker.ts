/// <reference lib="webworker" />
import { SplitError, splitPdf } from '../lib/pdf/split';
import type { SplitReply, SplitWorkerRequest } from './split-protocol';
import { unexpectedMessage } from './fail';

const post = (msg: SplitReply, transfer: Transferable[] = []) =>
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(msg, transfer);

self.onmessage = async (event: MessageEvent<SplitWorkerRequest>) => {
  const { file, ranges, mode } = event.data;
  try {
    const { type: mime, ...result } = await splitPdf(
      { name: file.name, bytes: await file.arrayBuffer(), ranges, mode },
      (p) => post({ type: 'progress', ...p }),
    );
    post({ type: 'done', mime, ...result }, [result.bytes.buffer]);
  } catch (err) {
    post({
      type: 'error',
      message:
        err instanceof SplitError
          ? err.message
          : unexpectedMessage(err, 'Something went wrong while splitting. Try again.'),
      fileName: file.name,
    });
  }
};
