import { useState } from 'react';
import { Pip, type PipPose } from '../components/pip/Pip';
import { DoneCard } from '../components/result/DoneCard';
import { ErrorCard } from '../components/result/ErrorCard';
import type { Accent } from '../components/ui';
import { DEFAULT_STEPS } from '../components/wait/progress';
import { BreadScene } from '../components/wait/scenes/BreadScene';
import { PizzaScene } from '../components/wait/scenes/PizzaScene';
import { QuillScene } from '../components/wait/scenes/QuillScene';
import { JarScene } from '../components/wait/scenes/JarScene';
import { ScrapbookScene } from '../components/wait/scenes/ScrapbookScene';
import { SuitcaseScene } from '../components/wait/scenes/SuitcaseScene';
import { ShredderScene } from '../components/wait/scenes/ShredderScene';
import { TailorScene } from '../components/wait/scenes/TailorScene';
import { WashScene } from '../components/wait/scenes/WashScene';
import { WaitStage } from '../components/wait/WaitStage';
import { useDocumentTitle } from '../useDocumentTitle';

const POSES: PipPose[] = ['sit', 'wave', 'puzzled', 'hold', 'celebrate', 'shrug'];
const LAB_BLOB = new Blob(['%PDF-1.7'], { type: 'application/pdf' });
const ACCENTS: Accent[] = ['coral', 'violet', 'mint', 'sunshine', 'sky'];

/** A made-up first page as a data URL, so the bench never fetches anything. */
const samplePage = (band: string, photo = false) =>
  `data:image/svg+xml,${encodeURIComponent(
    photo
      ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 30"><rect width="40" height="30" fill="${band}"/><circle cx="30" cy="8" r="4" fill="#fff6c2"/><path d="M0 30 L14 14 L24 24 L30 18 L40 30 Z" fill="#1b1033" opacity=".55"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 40"><rect width="30" height="40" fill="#fff"/><rect width="30" height="9" fill="${band}"/><rect x="4" y="13" width="22" height="2" fill="#c9c3dc"/><rect x="4" y="18" width="18" height="2" fill="#c9c3dc"/><rect x="4" y="23" width="22" height="9" fill="${band}" opacity=".35"/></svg>`,
  )}`;
const SAMPLE_PAGES = ['#7c5cff', '#ff6b8b', '#3ddc97', '#4cc9f0'].map((c) => samplePage(c));
const SAMPLE_PHOTOS = ['#4cc9f0', '#ffc857', '#ff6b8b', '#3ddc97'].map((c) => samplePage(c, true));

/**
 * Not linked anywhere. A bench for checking Pip's poses and the wait screen
 * across accents and themes.
 */
export default function PipLab() {
  useDocumentTitle('Pip lab');
  const [scrub, setScrub] = useState(0.4);
  const [replay, setReplay] = useState(0);
  const [samples, setSamples] = useState(true);
  const pages = samples ? SAMPLE_PAGES : [];
  const photos = samples ? SAMPLE_PHOTOS : [];
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
      <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          checked={samples}
          onChange={(e) => setSamples(e.target.checked)}
          className="size-4 accent-violet"
        />
        Sample pages in the scenes
      </label>
      <WaitStage
        className="mt-6"
        title="Merging 3 PDFs"
        current={DEFAULT_STEPS[slice]?.id ?? 'reading'}
        progress={within}
        accent="violet"
        scene={<JarScene progress={scrub} accent="violet" thumbs={pages} />}
      />
      <WaitStage
        className="mt-6"
        title="Splitting report.pdf"
        current={DEFAULT_STEPS[slice]?.id ?? 'reading'}
        progress={within}
        accent="coral"
        scene={<BreadScene progress={scrub} accent="coral" thumb={pages[1]} />}
      />
      <WaitStage
        className="mt-6"
        title="Turning scan.pdf"
        current={DEFAULT_STEPS[slice]?.id ?? 'reading'}
        progress={within}
        accent="sunshine"
        scene={<PizzaScene progress={scrub} accent="sunshine" thumb={pages[2]} />}
      />
      <WaitStage
        className="mt-6"
        title="Making a PDF of 4 photos"
        current={DEFAULT_STEPS[slice]?.id ?? 'reading'}
        progress={within}
        accent="mint"
        scene={<ScrapbookScene progress={scrub} accent="mint" photos={photos} />}
      />
      <WaitStage
        className="mt-6"
        title="Signing lease.pdf"
        current={DEFAULT_STEPS[slice]?.id ?? 'reading'}
        progress={within}
        accent="sky"
        scene={<QuillScene progress={scrub} accent="sky" thumb={pages[0]} />}
      />
      <WaitStage
        className="mt-6"
        title="Shrinking brochure.pdf"
        current={DEFAULT_STEPS[slice]?.id ?? 'reading'}
        progress={within}
        accent="coral"
        scene={<SuitcaseScene progress={scrub} accent="coral" thumb={pages[3]} />}
      />
      <WaitStage
        className="mt-6"
        title="Converting 2 photos to JPG"
        current={DEFAULT_STEPS[slice]?.id ?? 'reading'}
        progress={within}
        accent="sky"
        scene={<WashScene progress={scrub} accent="sky" thumb={photos[0]} label="JPG" />}
      />
      <WaitStage
        className="mt-6"
        title="Cutting beach.jpg to 1080 × 1350"
        current={DEFAULT_STEPS[slice]?.id ?? 'reading'}
        progress={within}
        accent="sunshine"
        scene={
          <TailorScene
            progress={scrub}
            accent="sunshine"
            thumb={photos[1]}
            aspect={4 / 5}
            label="1080 × 1350"
          />
        }
      />
      <WaitStage
        className="mt-6"
        title="Removing details from 3 photos"
        current={DEFAULT_STEPS[slice]?.id ?? 'reading'}
        progress={within}
        accent="violet"
        scene={<ShredderScene progress={scrub} accent="violet" thumb={photos[0]} />}
      />

      <div className="mt-16 flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="font-display text-3xl font-bold tracking-tight">Result cards</h2>
        <button
          type="button"
          onClick={() => setReplay((n) => n + 1)}
          className="rounded-lg text-sm font-semibold text-muted transition-colors hover:text-fg"
        >
          Replay the flip
        </button>
      </div>
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <DoneCard
          key={replay}
          accent="violet"
          title="Your PDF is ready"
          fileName="Quarterly-report-merged.pdf"
          blob={LAB_BLOB}
          details="3 files joined, 24 pages, 1.2 MB."
          downloadLabel="Download PDF"
          actions={[
            { label: 'Merge other PDFs', onClick: () => {} },
            { label: 'Change the order', onClick: () => {} },
          ]}
        />
        <ErrorCard
          title="The merge did not finish"
          message="scan-02.pdf could not be read. It may be damaged or password protected."
          fileName="scan-02.pdf"
          onRetry={() => {}}
          onBack={() => {}}
        />
      </div>
    </div>
  );
}
