/// <reference lib="webworker" />
import { SignError, signPdf } from '../lib/pdf/sign';
import type { SignReply, SignWorkerRequest } from './sign-protocol';

const post = (msg: SignReply, transfer: Transferable[] = []) =>
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(msg, transfer);

self.onmessage = async (event: MessageEvent<SignWorkerRequest>) => {
  const { file, signature, aspect, place, pages } = event.data;
  try {
    const result = await signPdf(
      {
        name: file.name,
        bytes: await file.arrayBuffer(),
        signature: await signature.arrayBuffer(),
        aspect,
        place,
        pages,
      },
      (p) => post({ type: 'progress', ...p }),
    );
    post({ type: 'done', ...result }, [result.bytes.buffer]);
  } catch (err) {
    post({
      type: 'error',
      message:
        err instanceof SignError
          ? err.message
          : 'Something went wrong while signing your PDF. Try again.',
      fileName: file.name,
    });
  }
};
