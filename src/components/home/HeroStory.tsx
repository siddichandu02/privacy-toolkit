import { useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { tally, useNetEntries } from '../../lib/netWatch';
import { useStillMotion } from '../../useStillMotion';
import { formatBytes } from '../drop/validate';
import { HeroScene, type StoryStep } from './HeroScene';

/** How long each step stays on stage, in ms. */
const STEP_MS: readonly [number, number, number] = [3000, 3300, 3300];

const STEPS = [
  { title: 'Drop your file in', line: 'It opens in this tab, read straight from your disk.' },
  {
    title: 'Your device does the work',
    line: 'Your computer or phone does the work. Nothing leaves it.',
  },
  { title: 'Save the result', line: 'The new file goes to Downloads. Nothing is left behind.' },
] as const;

/** The live reading, so step 2 shows a measurement instead of a claim. */
function SentSoFar() {
  const t = tally(useNetEntries());
  const clean = t.outsideRequests === 0;
  return (
    <span
      data-testid="story-sent"
      title="Sent to other sites since you opened this page, checked live"
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-px text-xs font-semibold whitespace-nowrap ${
        clean ? 'border-mint/30 bg-mint/10 text-mint' : 'border-coral/40 bg-coral/10 text-coral'
      }`}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${clean ? 'bg-mint' : 'bg-coral'}`}
      />
      {formatBytes(t.outsideBytes)} sent
    </span>
  );
}

/** True while the page is in the foreground. */
function useTabVisible() {
  const [visible, setVisible] = useState(() => document.visibilityState !== 'hidden');
  useEffect(() => {
    const on = () => setVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  return visible;
}

/**
 * "What happens to your file" as a small card in the hero that plays on a
 * loop: the file drops into the tab, the device works on it while the line
 * to the servers stays cut, and the result lands in Downloads. It rests while
 * off screen or in a background tab, can be paused, and each step can be
 * picked by hand. With reduced motion it starts paused.
 */
export function HeroStory({ className = '' }: { className?: string }) {
  const still = useStillMotion();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.3 });
  const tabVisible = useTabVisible();
  const [step, setStep] = useState<StoryStep>(0);
  // Bumped each time the loop starts over, so the sheets drop in fresh.
  const [round, setRound] = useState(0);
  const [paused, setPaused] = useState<boolean | null>(null);
  const isPaused = paused ?? still;
  const running = !isPaused && inView && tabVisible;

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => {
      if (step === 2) {
        setStep(0);
        setRound((r) => r + 1);
      } else {
        setStep((step + 1) as StoryStep);
      }
    }, STEP_MS[step]);
    return () => window.clearTimeout(timer);
  }, [running, step, round]);

  /** The fill bar for one step: full when done, filling while it plays. */
  const bar = (i: number) => (
    <span className="block h-1 overflow-hidden rounded-full bg-line">
      <span
        key={`${round}-${step}-${i}`}
        className={`block h-full origin-left rounded-full bg-violet ${
          i < step
            ? 'scale-x-100'
            : i > step
              ? 'scale-x-0'
              : isPaused
                ? 'scale-x-100'
                : 'story-fill'
        }`}
        style={
          i === step && !isPaused
            ? {
                animationDuration: `${STEP_MS[step]}ms`,
                animationPlayState: running ? 'running' : 'paused',
              }
            : undefined
        }
      />
    </span>
  );

  return (
    <section
      ref={ref}
      aria-labelledby="story-heading"
      data-testid="hero-story"
      data-running={running}
      className={`relative overflow-hidden rounded-panel border border-line bg-surface p-4 shadow-soft backdrop-blur-xl sm:p-5 lg:px-7 ${className}`}
    >
      {/* Phones: one row of bars across the top, like a story reel. */}
      <div aria-hidden="true" className="mb-3 grid grid-cols-3 gap-1.5 lg:hidden">
        {STEPS.map((s, i) => (
          <span key={s.title}>{bar(i)}</span>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5 lg:gap-8">
        <div className="mx-auto w-full max-w-sm shrink-0 sm:mx-0 sm:w-[46%] sm:max-w-72 lg:w-[22rem] lg:max-w-none">
          <div key={round} className="story-round">
            <HeroScene step={step} />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2
                id="story-heading"
                className="font-display text-base leading-tight font-bold tracking-tight sm:text-xl"
              >
                What happens to your file
              </h2>
              <span className="hidden text-xs text-muted lg:inline">
                Sent to other sites: <SentSoFar />
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPaused(!isPaused)}
              aria-label={isPaused ? 'Play the story' : 'Pause the story'}
              title={isPaused ? 'Play' : 'Pause'}
              className="tap -mt-1 -mr-1 grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-muted transition-[color,background-color,scale] hover:bg-surface-strong hover:text-fg active:scale-90 motion-reduce:active:scale-100"
            >
              <svg viewBox="0 0 16 16" className="size-3.5" fill="currentColor" aria-hidden="true">
                {isPaused ? (
                  <path d="M4.5 2.8v10.4L13 8Z" />
                ) : (
                  <path d="M4 2.5h2.8v11H4zM9.2 2.5H12v11H9.2z" />
                )}
              </svg>
            </button>
          </div>
          {/* Phones: a short list. Wider screens: three steps side by side. */}
          <ol
            aria-label="Three steps"
            className="mt-2 space-y-1 lg:mt-4 lg:grid lg:grid-cols-3 lg:gap-5 lg:space-y-0 pointer-coarse:space-y-0"
          >
            {STEPS.map((s, i) => {
              const on = i === step;
              return (
                <li key={s.title} aria-current={on ? 'step' : undefined}>
                  <button
                    type="button"
                    onClick={() => setStep(i as StoryStep)}
                    className={`group w-full cursor-pointer rounded-lg py-0.5 text-left transition-opacity duration-300 pointer-coarse:py-3 lg:pointer-coarse:py-0.5 ${
                      on ? '' : 'lg:opacity-55 lg:hover:opacity-100'
                    }`}
                  >
                    <span aria-hidden="true" className="mb-3 hidden lg:block">
                      {bar(i)}
                    </span>
                    <span
                      className={`flex items-center gap-2 text-sm transition-colors duration-300 sm:text-[0.95rem] ${
                        on ? 'font-semibold text-fg' : 'text-muted group-hover:text-fg lg:text-fg'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`grid size-5 shrink-0 place-items-center rounded-full text-[0.7rem] font-bold transition-colors duration-300 ${
                          on ? 'bg-violet-fill text-on-violet' : 'border border-line-strong'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className="min-w-0 lg:font-semibold">{s.title}</span>
                    </span>
                    <span className="mt-1 hidden text-sm leading-snug text-muted lg:block">
                      {s.line}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="mt-2.5 text-xs text-muted lg:hidden">
            Sent to other sites: <SentSoFar />
          </p>
        </div>
      </div>
    </section>
  );
}
