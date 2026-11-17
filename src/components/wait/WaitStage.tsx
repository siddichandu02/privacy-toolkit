import { AnimatePresence, motion } from 'framer-motion';
import { useStillMotion } from '../../useStillMotion';
import type { ReactNode } from 'react';
import { Pip } from '../pip/Pip';
import { accentDot, accentFill, accentText, type Accent } from '../ui/accent';
import { DEFAULT_STEPS, overallProgress, type WaitStep } from './progress';

export interface WaitStageProps {
  /** What the tool is doing as a whole, e.g. "Merging 3 PDFs". */
  title: string;
  steps?: readonly WaitStep[];
  /** Id of the step running now. */
  current: string;
  /** How far through the current step, 0 to 1. Comes from real work, never a timer. */
  progress: number;
  accent?: Accent;
  /** The story animation. Falls back to Pip sitting and watching. */
  scene?: ReactNode;
  className?: string;
}

/**
 * Wait screen shared by every tool: a story scene, the step list and one
 * progress bar. With reduced motion the scene becomes a still Pip and steps
 * simply fade.
 */
export function WaitStage({
  title,
  steps = DEFAULT_STEPS,
  current,
  progress,
  accent = 'violet',
  scene,
  className = '',
}: WaitStageProps) {
  const reduced = useStillMotion();
  const value = overallProgress(steps, current, progress);
  const pct = Math.round(value * 100);
  const index = Math.max(
    0,
    steps.findIndex((s) => s.id === current),
  );
  const step = steps[index];

  return (
    <section
      aria-label={title}
      className={`relative mx-auto w-full max-w-xl overflow-hidden rounded-panel border border-line bg-surface px-5 pt-6 pb-6 shadow-lifted backdrop-blur-xl sm:px-8 sm:pt-8 ${className}`}
    >
      <div
        className="relative mx-auto flex h-44 items-end justify-center sm:h-56"
        data-testid="scene"
      >
        <div
          aria-hidden="true"
          className={`absolute bottom-1 h-24 w-56 rounded-[50%] opacity-25 blur-2xl ${accentDot[accent]}`}
        />
        {reduced || !scene ? (
          <Pip accent={accent === 'violet' ? 'coral' : accent} className="relative h-full" />
        ) : (
          scene
        )}
      </div>

      <h2 className="mt-5 text-center font-display text-2xl font-bold tracking-tight text-balance sm:text-3xl">
        {title}
      </h2>

      <div className="mt-6 flex items-baseline justify-between gap-4">
        <div className="relative h-6 min-w-0 flex-1 overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p
              key={step?.id}
              initial={{ opacity: 0, y: reduced ? 0 : 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduced ? 0 : -14 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="truncate font-semibold"
            >
              {step?.label}
            </motion.p>
          </AnimatePresence>
        </div>
        <span
          className={`font-display text-lg font-bold tabular-nums ${accentText[accent]}`}
          aria-hidden="true"
        >
          {pct}%
        </span>
      </div>

      <div
        role="progressbar"
        aria-label={title}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={`${step?.label ?? ''}, ${pct}%`}
        className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-surface-strong"
      >
        <motion.div
          className={`h-full w-full origin-left rounded-full ${accentDot[accent]}`}
          initial={false}
          animate={{ scaleX: value }}
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 140, damping: 24 }}
        />
      </div>

      <ol className="mt-5 grid gap-2 sm:grid-cols-3" aria-label="Steps">
        {steps.map((s, i) => {
          const state = i < index ? 'done' : i === index ? 'current' : 'next';
          return (
            <li
              key={s.id}
              data-state={state}
              aria-current={state === 'current' ? 'step' : undefined}
              className={`flex items-center gap-2 text-sm ${state === 'next' ? 'text-muted' : ''} ${state === 'current' ? 'font-semibold' : ''}`}
            >
              <span
                aria-hidden="true"
                className={`grid size-5 shrink-0 place-items-center rounded-full border text-[11px] font-bold transition-colors duration-300 ${
                  state === 'next'
                    ? 'border-line-strong'
                    : `border-transparent ${accentFill[accent]}`
                }`}
              >
                {state === 'done' ? (
                  <svg viewBox="0 0 12 12" className="size-3">
                    <path
                      d="M2.5 6.5 5 9l4.5-6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span>{s.label}</span>
              <span className="sr-only">
                {state === 'done' ? '(done)' : state === 'current' ? '(in progress)' : ''}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="sr-only" aria-live="polite" data-testid="step-announcer">
        {step?.label}
      </p>
    </section>
  );
}
