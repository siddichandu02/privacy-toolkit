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

/** When the current run started and finished, from performance.now(). */
export interface JobClock {
  startedAt: number;
  doneAt: number | null;
}

export interface WorkerJobOptions<S extends string, D extends object, R extends object> {
  createWorker: WorkerFactory;
  /** The stage shown the moment a job starts. */
  firstStage: S;
  /** Turn the worker's finished payload into what the page needs. Keep it stable (module level). */
  finish: (done: D) => R;
  /** Shown when the worker will not start and the app was not updated. */
  crashMessage: string;
  /**
   * Start a worker ahead of time (once there are files to work on), so its
   * code is already loaded when the button is pressed. That makes the first
   * run start faster and lets it work with the connection off.
   */
  warm?: boolean;
}

/** Point a worker's replies and failures at this run (replacing any earlier handlers). */
function listen<M>(
  w: Worker,
  onMessage: (event: MessageEvent<M>) => void,
  onError: (event: ErrorEvent) => void,
) {
  w.onmessage = onMessage;
  w.onerror = onError;
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
  warm = false,
}: WorkerJobOptions<S, D, R>) {
  const [job, setJob] = useState<WorkerJob<S, R>>({ status: 'idle' });
  const [clock, setClock] = useState<JobClock | null>(null);
  const worker = useRef<Worker | null>(null);
  /** Bumped on every start, reset and unmount so late answers can tell they are stale. */
  const run = useRef(0);

  const stop = useCallback(() => {
    run.current += 1;
    worker.current?.terminate();
    worker.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  /** A loaded worker waiting for the next run. */
  const spare = useRef<Worker | null>(null);
  const dropSpare = useCallback(() => {
    spare.current?.terminate();
    spare.current = null;
  }, []);
  useEffect(() => dropSpare, [dropSpare]);

  const running = job.status === 'running';
  useEffect(() => {
    if (!warm) {
      dropSpare();
      return;
    }
    if (spare.current || running) return;
    let w: Worker;
    try {
      w = createWorker();
    } catch {
      return; // No worker support here; the run will say so.
    }
    // A spare that fails to load is simply dropped; the run makes its own and reports why.
    w.onerror = (event) => {
      event.preventDefault();
      if (spare.current === w) dropSpare();
    };
    spare.current = w;
  }, [warm, running, createWorker, dropSpare]);

  const start = useCallback(
    (request: Req, transfer: Transferable[] = []) => {
      stop();
      const w = spare.current ?? createWorker();
      spare.current = null;
      worker.current = w;
      let heard = false;
      setJob({ status: 'running', stage: firstStage, progress: 0 });
      setClock({ startedAt: performance.now(), doneAt: null });
      listen(
        w,
        (event: MessageEvent<WorkerReply<S, D>>) => {
          if (worker.current !== w) return;
          heard = true;
          const msg = event.data;
          if (msg.type === 'progress') {
            setJob({ status: 'running', stage: msg.stage, progress: msg.progress });
          } else if (msg.type === 'done') {
            setJob({ status: 'done', ...finish(msg as unknown as D) });
            const doneAt = performance.now();
            setClock((c) => c && { ...c, doneAt });
            stop();
          } else {
            setJob({ status: 'error', message: msg.message, fileName: msg.fileName });
            stop();
          }
        },
        (event) => {
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
        },
      );
      w.postMessage(request, transfer);
    },
    [createWorker, firstStage, finish, crashMessage, stop],
  );

  const reset = useCallback(() => {
    stop();
    setJob({ status: 'idle' });
    setClock(null);
  }, [stop]);

  return { job, clock, start, reset };
}
