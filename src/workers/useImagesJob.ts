import { useCallback } from 'react';
import type { ImagesStage } from '../lib/pdf/images';
import type { ImagesDone, ImagesWorkerRequest } from './images-protocol';
import { useWorkerJob, type WorkerFactory, type WorkerJob } from './useWorkerJob';

interface ImagesOutput {
  blob: Blob;
  name: string;
  pages: number;
}

export type ImagesJob = WorkerJob<ImagesStage, ImagesOutput>;

const defaultFactory: WorkerFactory = () =>
  new Worker(new URL('./images.worker.ts', import.meta.url), { type: 'module', name: 'images' });

const finish = ({ bytes, name, pages }: ImagesDone): ImagesOutput => ({
  blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }),
  name,
  pages,
});

/** Turn images into one PDF in a Web Worker. */
export function useImagesJob(createWorker: WorkerFactory = defaultFactory) {
  const { job, clock, start, reset } = useWorkerJob<
    ImagesWorkerRequest,
    ImagesStage,
    ImagesDone,
    ImagesOutput
  >({
    createWorker,
    firstStage: 'reading',
    finish,
    crashMessage: 'Something went wrong while making your PDF. Try again.',
  });
  const run = useCallback((request: ImagesWorkerRequest) => start(request), [start]);
  return { job: job as ImagesJob, clock, start: run, reset };
}
