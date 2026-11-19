import { useCallback, useEffect, useRef, useState } from 'react';
import type { MergeStage } from '../lib/pdf/merge';
import type { MergeReply } from './merge-protocol';

export type MergeJob =
  | { status: 'idle' }
  | { status: 'running'; stage: MergeStage; progress: number }
  | { status: 'done'; blob: Blob; size: number; pages: number }
  | { status: 'error'; message: string; fileName?: string };

export type WorkerFactory = () => Worker;

const defaultFactory: WorkerFactory = () =>
  new Worker(new URL('./merge.worker.ts', import.meta.url), { type: 'module', name: 'merge' });

/**
 * Runs a merge in a Web Worker so the page stays smooth. Each run gets a fresh
 * worker that is closed when it finishes, is reset, or the page unmounts.
 */
export function useMergeJob(createWorker: WorkerFactory = defaultFactory) {
  const [job, setJob] = useState<MergeJob>({ status: 'idle' });
  const worker = useRef<Worker | null>(null);

  const stop = useCallback(() => {
    worker.current?.terminate();
    worker.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  const start = useCallback(
    (files: File[]) => {
      stop();
      const w = createWorker();
      worker.current = w;
      setJob({ status: 'running', stage: 'reading', progress: 0 });
      w.onmessage = (event: MessageEvent<MergeReply>) => {
        if (worker.current !== w) return;
        const msg = event.data;
        if (msg.type === 'progress') {
          setJob({ status: 'running', stage: msg.stage, progress: msg.progress });
        } else if (msg.type === 'done') {
          const blob = new Blob([msg.bytes as BlobPart], { type: 'application/pdf' });
          setJob({ status: 'done', blob, size: blob.size, pages: msg.pages });
          stop();
        } else {
          setJob({ status: 'error', message: msg.message, fileName: msg.fileName });
          stop();
        }
      };
      w.onerror = (event) => {
        event.preventDefault();
        if (worker.current !== w) return;
        setJob({ status: 'error', message: 'Something went wrong while merging. Try again.' });
        stop();
      };
      w.postMessage({ files });
    },
    [createWorker, stop],
  );

  const reset = useCallback(() => {
    stop();
    setJob({ status: 'idle' });
  }, [stop]);

  return { job, start, reset };
}
