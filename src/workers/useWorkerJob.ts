import { useCallback, useEffect, useRef, useState } from 'react';

/** What every tool worker sends back. `D` is the tool's own finished payload. */
export type WorkerReply<S extends string, D extends object> =
  | { type: 'progress'; stage: S; progress: number }
  | ({ type: 'done' } & D)
  | { type: 'error'; message: string; fileName?: string };

export type WorkerJob<S extends string, R extends object> =
  | { status: 'idle' }
  | { status: 'running'; stage: S; progress: number }
  | ({ status: 'done' } & R)
  | { status: 'error'; message: string; fileName?: string };

export type WorkerFactory = () => Worker;

export interface WorkerJobOptions<S extends string, D extends object, R extends object> {
  createWorker: WorkerFactory;
  /** The stage shown the moment a job starts. */
  firstStage: S;
  /** Turn the worker's finished payload into what the page needs. Keep it stable (module level). */
  finish: (done: D) => R;
  /** Shown when the worker crashes without telling us why. */
  crashMessage: string;
}

/**
 * Runs one job in a Web Worker so the page stays smooth. Each run gets a fresh
 * worker that is closed when it finishes, is reset, or the page unmounts.
 * Messages from a worker that has been replaced are ignored.
 */
export function useWorkerJob<Req, S extends string, D extends object, R extends object>({
  createWorker,
  firstStage,
  finish,
  crashMessage,
}: WorkerJobOptions<S, D, R>) {
  const [job, setJob] = useState<WorkerJob<S, R>>({ status: 'idle' });
  const worker = useRef<Worker | null>(null);

  const stop = useCallback(() => {
    worker.current?.terminate();
    worker.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  const start = useCallback(
    (request: Req, transfer: Transferable[] = []) => {
      stop();
      const w = createWorker();
      worker.current = w;
      setJob({ status: 'running', stage: firstStage, progress: 0 });
      w.onmessage = (event: MessageEvent<WorkerReply<S, D>>) => {
        if (worker.current !== w) return;
        const msg = event.data;
        if (msg.type === 'progress') {
          setJob({ status: 'running', stage: msg.stage, progress: msg.progress });
        } else if (msg.type === 'done') {
          setJob({ status: 'done', ...finish(msg as unknown as D) });
          stop();
        } else {
          setJob({ status: 'error', message: msg.message, fileName: msg.fileName });
          stop();
        }
      };
      w.onerror = (event) => {
        event.preventDefault();
        if (worker.current !== w) return;
        setJob({ status: 'error', message: crashMessage });
        stop();
      };
      w.postMessage(request, transfer);
    },
    [createWorker, firstStage, finish, crashMessage, stop],
  );

  const reset = useCallback(() => {
    stop();
    setJob({ status: 'idle' });
  }, [stop]);

  return { job, start, reset };
}
