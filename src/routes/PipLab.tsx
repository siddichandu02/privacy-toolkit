import { useState } from 'react';
import { Pip, type PipPose } from '../components/pip/Pip';
import type { Accent } from '../components/ui';
import { DEFAULT_STEPS } from '../components/wait/progress';
import { PancakeScene } from '../components/wait/scenes/PancakeScene';
import { WaitStage } from '../components/wait/WaitStage';
import { useDocumentTitle } from '../useDocumentTitle';

const POSES: PipPose[] = ['sit', 'wave', 'puzzled', 'hold'];
const ACCENTS: Accent[] = ['coral', 'violet', 'mint', 'sunshine', 'sky'];

/**
 * Not linked anywhere. A bench for checking Pip's poses and the wait screen
 * across accents and themes.
 */
export default function PipLab() {
  useDocumentTitle('Pip lab');
  const [scrub, setScrub] = useState(0.4);
  const slice = Math.min(DEFAULT_STEPS.length - 1, Math.floor(scrub * DEFAULT_STEPS.length));
  const within = scrub * DEFAULT_STEPS.length - slice;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 pb-16 sm:px-8 sm:pt-16">
      <h1 tabIndex={-1} className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
        Pip lab
      </h1>
      <p className="mt-3 max-w-xl text-muted">
        Every pose in every accent. Toggle the theme to check both.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {POSES.map((pose) => (
          <figure
            key={pose}
            className="rounded-panel border border-line bg-surface p-6 shadow-soft backdrop-blur-xl"
          >
            <Pip pose={pose} className="mx-auto h-48" title={`Pip, ${pose} pose`} />
            <figcaption className="mt-4 text-center font-semibold capitalize">{pose}</figcaption>
          </figure>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-center gap-6 rounded-panel border border-line bg-surface p-6 shadow-soft backdrop-blur-xl">
        {ACCENTS.map((accent) => (
          <Pip key={accent} accent={accent} className="h-28" title={`Pip in ${accent}`} />
        ))}
      </div>

      <h2 className="mt-16 font-display text-3xl font-bold tracking-tight">Wait screen</h2>
      <label className="mt-4 flex max-w-md items-center gap-4 text-sm font-semibold">
        Progress
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={scrub}
          onChange={(e) => setScrub(Number(e.target.value))}
          className="flex-1 accent-violet"
        />
      </label>
      <WaitStage
        className="mt-6"
        title="Merging 3 PDFs"
        current={DEFAULT_STEPS[slice]?.id ?? 'reading'}
        progress={within}
        accent="violet"
        scene={<PancakeScene progress={scrub} accent="violet" />}
      />
    </div>
  );
}
