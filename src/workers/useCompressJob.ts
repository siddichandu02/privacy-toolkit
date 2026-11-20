import { useCallback } from 'react';
import type { CompressStage } from '../lib/pdf/compress';
import type { CompressDone, CompressWorkerRequest } from './compress-protocol';
import { useWorkerJob, type WorkerFactory, type WorkerJob } from './useWorkerJob';

interface CompressOutput {
  blob: Blob;
  name: string;
  before: number;
  after: number;
  images: number;
  shrunk: number;
  smaller: boolean;
}

export type CompressJob = WorkerJob<CompressStage, CompressOutput>;

const defaultFactory: WorkerFactory = () =>
  new Worker(new URL('./compress.worker.ts', import.meta.url), {
    type: 'module',
    name: 'compress',
  });

const finish = ({ bytes, ...rest }: CompressDone): CompressOutput => ({
  blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }),
  ...rest,
});

/** Shrink a PDF in a Web Worker. */
export function useCompressJob(createWorker: WorkerFactory = defaultFactory) {
  const { job, start, reset } = useWorkerJob<
    CompressWorkerRequest,
    CompressStage,
    CompressDone,
    CompressOutput
  >({
    createWorker,
    firstStage: 'reading',
    finish,
    crashMessage: 'Something went wrong while shrinking your PDF. Try again.',
  });
  const compress = useCallback((request: CompressWorkerRequest) => start(request), [start]);
  return { job: job as CompressJob, start: compress, reset };
}
