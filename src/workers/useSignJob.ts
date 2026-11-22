import { useCallback } from 'react';
import type { SignStage } from '../lib/pdf/sign';
import type { SignDone, SignWorkerRequest } from './sign-protocol';
import { useWorkerJob, type WorkerFactory, type WorkerJob } from './useWorkerJob';

interface SignOutput {
  blob: Blob;
  name: string;
  pages: number;
  signed: number;
}

export type SignJob = WorkerJob<SignStage, SignOutput>;

const defaultFactory: WorkerFactory = () =>
  new Worker(new URL('./sign.worker.ts', import.meta.url), { type: 'module', name: 'sign' });

const finish = ({ bytes, name, pages, signed }: SignDone): SignOutput => ({
  blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }),
  name,
  pages,
  signed,
});

/** Stamp a signature on PDF pages in a Web Worker. */
export function useSignJob(createWorker: WorkerFactory = defaultFactory, warm = false) {
  const { job, clock, start, reset } = useWorkerJob<
    SignWorkerRequest,
    SignStage,
    SignDone,
    SignOutput
  >({
    createWorker,
    warm,
    firstStage: 'reading',
    finish,
    crashMessage: 'Something went wrong while signing your PDF. Try again.',
  });
  const sign = useCallback((request: SignWorkerRequest) => start(request), [start]);
  return { job: job as SignJob, clock, start: sign, reset };
}
