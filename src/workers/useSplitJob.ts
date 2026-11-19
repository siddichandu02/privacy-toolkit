import { useCallback } from 'react';
import type { SplitStage } from '../lib/pdf/split';
import type { SplitDone, SplitWorkerRequest } from './split-protocol';
import { useWorkerJob, type WorkerFactory, type WorkerJob } from './useWorkerJob';

interface SplitOutput {
  blob: Blob;
  name: string;
  /** PDFs made: 1 for an extract, one per range otherwise. */
  files: number;
  pages: number;
}

export type SplitJob = WorkerJob<SplitStage, SplitOutput>;

const defaultFactory: WorkerFactory = () =>
  new Worker(new URL('./split.worker.ts', import.meta.url), { type: 'module', name: 'split' });

const finish = ({ bytes, name, mime, files, pages }: SplitDone): SplitOutput => ({
  blob: new Blob([bytes as BlobPart], { type: mime }),
  name,
  files,
  pages,
});

/** Split or extract PDF pages in a Web Worker. */
export function useSplitJob(createWorker: WorkerFactory = defaultFactory) {
  const { job, start, reset } = useWorkerJob<
    SplitWorkerRequest,
    SplitStage,
    SplitDone,
    SplitOutput
  >({
    createWorker,
    firstStage: 'reading',
    finish,
    crashMessage: 'Something went wrong while splitting. Try again.',
  });
  const split = useCallback((request: SplitWorkerRequest) => start(request), [start]);
  return { job: job as SplitJob, start: split, reset };
}
