import { useInView } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { tally, useNetEntries } from '../../lib/netWatch';
import { formatBytes } from '../drop/validate';
import { StoryScene, type StoryStep } from './StoryScene';

/** The live reading, so step 2 shows a measurement instead of a claim. */
function SentSoFar() {
  const t = tally(useNetEntries());
  const clean = t.outsideRequests === 0;
  return (
    <span
      data-testid="story-sent"
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-semibold whitespace-nowrap ${
        clean ? 'border-mint/30 bg-mint/10 text-mint' : 'border-coral/40 bg-coral/10 text-coral'
      }`}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${clean ? 'bg-mint' : 'bg-coral'}`}
      />
      {formatBytes(t.outsideBytes)}
    </span>
  );
}

interface StepCopy {
  title: string;
  body: ReactNode;
}

const STEPS: StepCopy[] = [
  {
    title: 'Drop your file in',
    body: 'It opens in this tab. Your browser reads it straight from your disk, the same way it shows a photo you open.',
  },
  {
    title: 'Your device does the work',
    body: (
      <>
        Merging, compressing and signing run on your own computer or phone. Sent to other sites
        since you opened this page: <SentSoFar />
      </>
    ),
  },
  {
    title: 'Save the result',
    body: 'The new file goes to your Downloads. Close the tab and nothing is left behind, here or anywhere else.',
  },
];

/** One step of copy. Tells the section when it reaches the middle of the screen. */
function Step({
  index,
  active,
  onReach,
  copy,
}: {
  index: StoryStep;
  active: boolean;
  onReach: (i: StoryStep) => void;
  copy: StepCopy;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const centered = useInView(ref, { margin: '-45% 0px -45% 0px' });
  const seen = useInView(ref, { once: true, amount: 0.4 });

  useEffect(() => {
    if (centered) onReach(index);
  }, [centered, index, onReach]);

  return (
    <li
      ref={ref}
      aria-current={active ? 'step' : undefined}
      className="grid gap-5 lg:flex lg:min-h-[62vh] lg:items-center"
    >
      {/* Phones and tablets: every step brings its own scene. */}
      <div className="mx-auto w-full max-w-sm lg:hidden">
        <StoryScene step={seen ? index : index === 0 ? 0 : ((index - 1) as StoryStep)} />
      </div>
      <div
        className={`flex gap-4 transition-opacity duration-300 ${
          active ? 'lg:opacity-100' : 'lg:opacity-40'
        }`}
      >
        <span
          aria-hidden="true"
          className={`grid size-10 shrink-0 place-items-center rounded-full border-2 font-display text-lg font-extrabold transition-colors duration-300 ${
            active ? 'border-violet bg-violet-fill text-on-violet' : 'border-line-strong text-muted'
          }`}
        >
          {index + 1}
        </span>
        <div className="max-w-md">
          <h3 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {copy.title}
          </h3>
          <p className="mt-2 text-lg leading-relaxed text-muted">{copy.body}</p>
        </div>
      </div>
    </li>
  );
}

/**
 * Three steps that play out as you scroll: on wide screens a single scene
 * stays pinned beside the steps and follows along; on phones each step has
 * its own scene that plays once it scrolls into view.
 */
export function HowItWorks({ className = '' }: { className?: string }) {
  const [active, setActive] = useState<StoryStep>(0);

  return (
    <section aria-labelledby="story-heading" className={className}>
      <h2 id="story-heading" className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
        What happens to your file
      </h2>
      <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16">
        <div className="hidden lg:block">
          <div className="sticky top-[18vh] rounded-panel border border-line bg-surface p-8 shadow-soft backdrop-blur-xl">
            <StoryScene step={active} />
          </div>
        </div>
        <ol aria-label="Three steps" className="grid gap-14 lg:gap-0">
          {STEPS.map((copy, i) => (
            <Step
              key={copy.title}
              index={i as StoryStep}
              active={active === i}
              onReach={setActive}
              copy={copy}
            />
          ))}
        </ol>
      </div>
    </section>
  );
}
