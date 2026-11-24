import { useCallback, useEffect, useRef, useState } from 'react';
import { hasHeic, prepareImages } from '../lib/image/heic';
import { useWorkerJob, type JobClock, type WorkerFactory, type WorkerJob } from './useWorkerJob';

/** What a photo worker gets: HEIC photos already decoded, plus the sizes as picked. */
export interface PreparedRequest<Settings> {
  files: File[];
  settings: Settings;
  sizes?: number[];
  /** Positions of HEIC photos the page could not decode; they are left out and named. */
  undecoded?: number[];
}

/** Share of the "reading" stage spent decoding HEIC photos on the page. */
const DECODE_SHARE = 0.9;

export type Prepare = typeof prepareImages;

interface Options<D extends object, R extends object> {
  createWorker: WorkerFactory;
  warm: boolean;
  prepare: Prepare;
  finish: (done: D) => R;
  crashMessage: string;
}

type Stage = 'reading' | 'working' | 'packing';

/**
 * Run a photo job in a Web Worker. HEIC photos are decoded on the page first
 * (the decoder needs a canvas the worker does not have), which shows as the
 * "reading" stage, so the story starts the moment the button is pressed.
 */
export function usePreparedJob<Settings, D extends object, R extends object>({
  createWorker,
  warm,
  prepare,
  finish,
  crashMessage,
}: Options<D, R>) {
  const { job, clock, start, reset } = useWorkerJob<PreparedRequest<Settings>, Stage, D, R>({
    createWorker,
    warm,
    firstStage: 'reading',
    finish,
    crashMessage,
  });

  /** Set while HEIC photos are decoded, before the worker gets them. */
  const [decoding, setDecoding] = useState<{ share: number; startedAt: number } | null>(null);
  /** When the current run really started, so the story does not restart after decoding. */
  const [startedAt, setStartedAt] = useState<number | null>(null);
  /** This run decoded HEIC photos, so its reading stage is already mostly done. */
  const [decoded, setDecoded] = useState(false);
  const run = useRef(0);
  useEffect(
    () => () => {
      run.current += 1;
    },
    [],
  );

  const go = useCallback(
    async (files: File[], settings: Settings) => {
      const mine = ++run.current;
      const t0 = performance.now();
      setStartedAt(t0);
      setDecoded(false);
      if (!hasHeic(files)) {
        setDecoding(null);
        start({ files, settings });
        return;
      }
      reset();
      setDecoding({ share: 0, startedAt: t0 });
      const ready = await prepare(files, (share) => {
        if (run.current === mine) setDecoding({ share, startedAt: t0 });
      });
      if (run.current !== mine) return;
      setDecoding(null);
      setDecoded(true);
      start({ files: ready.files, settings, sizes: ready.sizes, undecoded: ready.undecoded });
    },
    [start, reset, prepare],
  );

  const resetAll = useCallback(() => {
    run.current += 1;
    setDecoding(null);
    setStartedAt(null);
    setDecoded(false);
    reset();
  }, [reset]);

  let view: WorkerJob<Stage, R> = job;
  let viewClock: JobClock | null = clock;
  if (decoding) {
    view = { status: 'running', stage: 'reading', progress: decoding.share * DECODE_SHARE };
    viewClock = { startedAt: decoding.startedAt, doneAt: null };
  } else {
    if (clock && startedAt !== null && startedAt < clock.startedAt) {
      viewClock = { ...clock, startedAt };
    }
    // Keep the bar from stepping back when the worker reports its own reading.
    if (decoded && job.status === 'running' && job.stage === 'reading') {
      view = { ...job, progress: Math.max(job.progress, DECODE_SHARE) };
    }
  }

  return { job: view, clock: viewClock, start: go, reset: resetAll };
}
