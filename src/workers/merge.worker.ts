/// <reference lib="webworker" />
import { MergeError, mergePdfs, type MergeSource } from '../lib/pdf/merge';
import type { MergeReply, MergeRequest } from './merge-protocol';
import { unexpectedMessage } from './fail';

const post = (msg: MergeReply, transfer: Transferable[] = []) =>
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(msg, transfer);

self.onmessage = async (event: MessageEvent<MergeRequest>) => {
  const { files } = event.data;
  try {
    const sources: MergeSource[] = [];
    for (const file of files) sources.push({ name: file.name, bytes: await file.arrayBuffer() });
    const { bytes, pages } = await mergePdfs(sources, (p) => post({ type: 'progress', ...p }));
    post({ type: 'done', bytes, pages }, [bytes.buffer]);
  } catch (err) {
    post({
      type: 'error',
      message:
        err instanceof MergeError
          ? err.message
          : unexpectedMessage(err, 'Something went wrong while merging. Try again.'),
      fileName: err instanceof MergeError ? err.fileName : undefined,
    });
  }
};
