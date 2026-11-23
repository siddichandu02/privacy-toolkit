import { useCallback } from 'react';
import type { ResizeStage } from '../lib/image/resize';
import type { ResizeDone, ResizeWorkerRequest } from './resize-protocol';
import { useWorkerJob, type WorkerFactory, type WorkerJob } from './useWorkerJob';

interface ResizeOutput {
  blob: Blob;
  name: string;
  width: number;
  height: number;
  before: number;
  after: number;
}

export type ResizeJob = WorkerJob<ResizeStage, ResizeOutput>;

export const resizeWorker: WorkerFactory = () =>
  new Worker(new URL('./resize.worker.ts', import.meta.url), { type: 'module', name: 'resize' });

const finish = ({ bytes, mime, name, width, height, before, after }: ResizeDone): ResizeOutput => ({
  blob: new Blob([bytes as BlobPart], { type: mime }),
  name,
  width,
  height,
  before,
  after,
});

/** Cut and scale one photo in a Web Worker. */
export function useResizeJob(createWorker: WorkerFactory = resizeWorker, warm = false) {
  const { job, clock, start, reset } = useWorkerJob<
    ResizeWorkerRequest,
    ResizeStage,
    ResizeDone,
    ResizeOutput
  >({
    createWorker,
    warm,
    firstStage: 'reading',
    finish,
    crashMessage: 'Something went wrong while resizing your photo. Try again.',
  });
  const run = useCallback((request: ResizeWorkerRequest) => start(request), [start]);
  return { job: job as ResizeJob, clock, start: run, reset };
}
