import { useCallback, useEffect, useRef, useState } from 'react';
import { hasNewerVersion } from './appVersion';
import { MEMORY_MESSAGE } from './fail';

/** What every tool worker sends back. `D` is the tool's own finished payload. */
export type WorkerReply<S extends string, D extends object> =
  | { type: 'progress'; stage: S; progress: number }
  | ({ type: 'done' } & D)
  | { type: 'error'; message: string; fileName?: string };

export type WorkerJob<S extends string, R extends object> =
  | { status: 'idle' }
  | { status: 'running'; stage: S; progress: number }
  | ({ status: 'done' } & R)
  | { status: 'error'; message: string; fileName?: string; reason?: FailReason };

/** `updated`: the worker file is gone because a newer version was deployed. */
export type FailReason = 'updated';

export type WorkerFactory = () => Worker;

export interface WorkerJobOptions<S extends string, D extends object, R extends object> {
  createWorker: WorkerFactory;
  /** The stage shown the moment a job starts. */
  firstStage: S;
  /** Turn the worker's finished payload into what the page needs. Keep it stable (module level). */
  finish: (done: D) => R;
  /** Shown when the worker will not start and the app was not updated. */
  crashMessage: string;
}

export const UPDATED_MESSAGE =
  'Privacy Toolkit was updated while this page was open. Reload to get the new version, then add your files again.';

/**
 * Runs one job in a Web Worker so the page stays smooth. Each run gets a fresh
 * worker that is closed when it finishes, is reset, or the page unmounts.
 * Messages from a worker that has been replaced are ignored, so a failed run
 * never leaks into the next one.
 *
 * A worker can fail without a message in two ways: its file never loaded
 * (usually because a newer version was deployed while the tab was open, which
 * renames every file) or the browser killed it mid-job (usually memory). The
 * first gets a reload prompt, since retrying would fail the same way.
 */
export function useWorkerJob<Req, S extends string, D extends object, R extends object>({
  createWorker,
  firstStage,
  finish,
  crashMessage,
}: WorkerJobOptions<S, D, R>) {
  const [job, setJob] = useState<WorkerJob<S, R>>({ status: 'idle' });
  const worker = useRef<Worker | null>(null);
  /** Bumped on every start, reset and unmount so late answers can tell they are stale. */
  const run = useRef(0);

  const stop = useCallback(() => {
    run.current += 1;
    worker.current?.terminate();
    worker.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  const start = useCallback(
    (request: Req, transfer: Transferable[] = []) => {
      stop();
      const w = createWorker();
      worker.current = w;
      let heard = false;
      setJob({ status: 'running', stage: firstStage, progress: 0 });
      w.onmessage = (event: MessageEvent<WorkerReply<S, D>>) => {
        if (worker.current !== w) return;
        heard = true;
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
        stop();
        const checking = run.current;
        if (heard) {
          setJob({ status: 'error', message: MEMORY_MESSAGE });
          return;
        }
        void hasNewerVersion().then((updated) => {
          // Started over, reset or left while we were checking.
          if (run.current !== checking) return;
          setJob(
            updated
              ? { status: 'error', message: UPDATED_MESSAGE, reason: 'updated' }
              : { status: 'error', message: crashMessage },
          );
        });
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
