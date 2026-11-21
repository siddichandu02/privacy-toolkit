import { useCallback } from 'react';
import type { MergeStage } from '../lib/pdf/merge';
import type { MergeRequest } from './merge-protocol';
import { useWorkerJob, type WorkerFactory, type WorkerJob } from './useWorkerJob';

export type { WorkerFactory };

export type MergeJob = WorkerJob<MergeStage, { blob: Blob; size: number; pages: number }>;

const defaultFactory: WorkerFactory = () =>
  new Worker(new URL('./merge.worker.ts', import.meta.url), { type: 'module', name: 'merge' });

const finish = ({ bytes, pages }: { bytes: Uint8Array; pages: number }) => {
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  return { blob, size: blob.size, pages };
};

/** Merge PDFs in a Web Worker. */
export function useMergeJob(createWorker: WorkerFactory = defaultFactory) {
  const { job, clock, start, reset } = useWorkerJob<
    MergeRequest,
    MergeStage,
    Parameters<typeof finish>[0],
    ReturnType<typeof finish>
  >({
    createWorker,
    firstStage: 'reading',
    finish,
    crashMessage: 'Something went wrong while merging. Try again.',
  });
  const merge = useCallback((files: File[]) => start({ files }), [start]);
  return { job: job as MergeJob, clock, start: merge, reset };
}
