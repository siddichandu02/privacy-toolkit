import { useCallback } from 'react';
import type { RotateStage } from '../lib/pdf/rotate';
import type { RotateDone, RotateWorkerRequest } from './rotate-protocol';
import { useWorkerJob, type WorkerFactory, type WorkerJob } from './useWorkerJob';

interface RotateOutput {
  blob: Blob;
  name: string;
  pages: number;
  rotated: number;
  removed: number;
}

export type RotateJob = WorkerJob<RotateStage, RotateOutput>;

const defaultFactory: WorkerFactory = () =>
  new Worker(new URL('./rotate.worker.ts', import.meta.url), { type: 'module', name: 'rotate' });

const finish = ({ bytes, name, pages, rotated, removed }: RotateDone): RotateOutput => ({
  blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }),
  name,
  pages,
  rotated,
  removed,
});

/** Turn and drop PDF pages in a Web Worker. */
export function useRotateJob(createWorker: WorkerFactory = defaultFactory) {
  const { job, start, reset } = useWorkerJob<
    RotateWorkerRequest,
    RotateStage,
    RotateDone,
    RotateOutput
  >({
    createWorker,
    firstStage: 'reading',
    finish,
    crashMessage: 'Something went wrong while saving your pages. Try again.',
  });
  const rotate = useCallback((request: RotateWorkerRequest) => start(request), [start]);
  return { job: job as RotateJob, start: rotate, reset };
}
