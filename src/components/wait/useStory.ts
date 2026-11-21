import { useCallback, useEffect, useState } from 'react';
import { useStillMotion } from '../../useStillMotion';
import type { JobClock, WorkerJob } from '../../workers/useWorkerJob';
import { overallProgress, stepAt, type WaitStep } from './progress';

/** How long the full story runs at least, so people actually get to see it. */
export const STORY_MS = 6000;
/** The calm version for people who ask for reduced motion. */
export const STILL_STORY_MS = 1500;
/** The quiet skip link shows up after this long. */
export const SKIP_AFTER_MS = 2000;
/** Share of the story kept for the finale, after the work has caught up. */
const FINALE_SHARE = 0.2;
const TICK_MS = 100;

/** Lets the e2e suite (and impatient developers) shorten the story. */
export const STORY_OVERRIDE_KEY = 'ptk-story-ms';

/** Minimum story length for this visit. Zero in unit tests. */
export function storyLength(still: boolean): number {
  try {
    const raw = globalThis.localStorage?.getItem(STORY_OVERRIDE_KEY);
    if (raw) {
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 0) return n;
    }
  } catch {
    // Storage can be blocked; fall through to the defaults.
  }
  if (import.meta.env.MODE === 'test') return 0;
  return still ? STILL_STORY_MS : STORY_MS;
}

/**
 * Where the story is, from 0 to 1. It is paced by time so the scene plays out
 * over `minMs`, but it never runs ahead of the real work: if the work is slow
 * the scene waits (and loops its middle act) until progress catches up.
 */
export function storyProgress(real: number, elapsed: number, minMs: number): number {
  const actMs = minMs * (1 - FINALE_SHARE);
  const paced = actMs <= 0 ? 1 : elapsed / actMs;
  return Math.max(0, Math.min(1, real, paced));
}

/** When the result may be shown: after the full story and a short finale. */
export function revealAt({ startedAt, doneAt }: JobClock, minMs: number): number {
  if (doneAt === null) return Infinity;
  return Math.max(startedAt + minMs, doneAt + minMs * FINALE_SHARE);
}

type AnyJob = WorkerJob<string, object>;

/**
 * Holds a finished job behind its story for at least `minMs`. The real work
 * runs in parallel; this only decides when the result is shown. Errors are
 * never held back. While held, the job looks like it is still running, with
 * stage and progress following the story.
 */
export function useStory<J extends AnyJob>(
  job: J,
  timing: JobClock | null | undefined,
  steps: readonly WaitStep[],
  minMs?: number,
) {
  const still = useStillMotion();
  const length = minMs ?? storyLength(still);
  const clock = timing ?? null;
  const [now, setNow] = useState(0);
  const [skippedRun, setSkippedRun] = useState<number | null>(null);

  const skipped = clock !== null && skippedRun === clock.startedAt;
  const elapsed = clock ? Math.max(0, now - clock.startedAt) : 0;
  const held =
    job.status === 'done' &&
    clock !== null &&
    length > 0 &&
    !skipped &&
    now < revealAt(clock, length);
  const ticking = (job.status === 'running' && length > 0) || held;

  useEffect(() => {
    if (!ticking) return;
    const tick = () => setNow(performance.now());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, TICK_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [ticking]);

  const real =
    job.status === 'done'
      ? 1
      : job.status === 'running'
        ? overallProgress(steps, job.stage, job.progress)
        : 0;
  const progress = skipped ? real : storyProgress(real, elapsed, length);
  const runId = clock?.startedAt ?? null;
  const skip = useCallback(() => setSkippedRun(runId), [runId]);

  let view: J = job;
  if (job.status === 'running' || held) {
    const at = stepAt(steps, progress);
    view = { status: 'running', stage: at.current, progress: at.progress } as J;
  }

  return {
    /** The job as the page should show it. */
    job: view,
    /** Story progress, 0 to 1, for the scene. */
    progress,
    /** True once the quiet skip link may show. */
    canSkip: (job.status === 'running' || held) && !skipped && elapsed >= SKIP_AFTER_MS,
    skip,
  };
}
