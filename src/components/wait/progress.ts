export interface WaitStep {
  id: string;
  /** What is happening right now, e.g. "Reading your files". */
  label: string;
}

/** The three stages almost every tool goes through. */
export const DEFAULT_STEPS: readonly WaitStep[] = [
  { id: 'reading', label: 'Reading your files' },
  { id: 'working', label: 'Doing the work' },
  { id: 'packing', label: 'Packing it up' },
];

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/**
 * Overall progress from 0 to 1. Each step gets an equal slice; `progress` is
 * how far through the current step we are. Unknown steps count as the start.
 */
export function overallProgress(
  steps: readonly WaitStep[],
  current: string,
  progress: number,
): number {
  if (steps.length === 0) return 0;
  const index = steps.findIndex((s) => s.id === current);
  if (index < 0) return 0;
  return (index + clamp01(progress)) / steps.length;
}
