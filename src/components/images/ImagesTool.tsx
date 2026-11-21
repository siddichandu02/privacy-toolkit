import { AnimatePresence, motion } from 'framer-motion';
import { useId, useState } from 'react';
import {
  DEFAULT_OPTIONS,
  type ImagesOptions,
  type Margin,
  type Orientation,
  type PageSize,
} from '../../lib/pdf/images';
import type { ToolInfo } from '../../tools';
import { useStillMotion } from '../../useStillMotion';
import { useImagesJob } from '../../workers/useImagesJob';
import { ToolWorkbench } from '../drop/ToolWorkbench';
import { useFileQueue, type QueuedFile } from '../drop/useFileQueue';
import { formatBytes } from '../drop/validate';
import { DoneCard } from '../result/DoneCard';
import { ErrorCard } from '../result/ErrorCard';
import { Button } from '../ui';
import type { Accent } from '../ui/accent';
import { Segmented, type SegmentOption } from '../ui/Segmented';
import { type WaitStep } from '../wait/progress';
import { useStory } from '../wait/useStory';
import { useThumbnails } from '../wait/useThumbnails';
import { ScrapbookScene } from '../wait/scenes/ScrapbookScene';
import { WaitStage } from '../wait/WaitStage';
import { PagePreview } from './PagePreview';

const pagesWord = (n: number) => (n === 1 ? '1 page' : `${n} pages`);
const imagesWord = (n: number) => (n === 1 ? '1 image' : `${n} images`);

const STEPS: readonly WaitStep[] = [
  { id: 'reading', label: 'Opening your images' },
  { id: 'working', label: 'Pinning them onto pages' },
  { id: 'packing', label: 'Saving the PDF' },
];

const SIZES: readonly SegmentOption<PageSize>[] = [
  { id: 'a4', label: 'A4' },
  { id: 'letter', label: 'Letter' },
  { id: 'fit', label: 'Fit image' },
];

const ORIENTATIONS: readonly SegmentOption<Orientation>[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'portrait', label: 'Portrait', icon: <SheetIcon wide={false} /> },
  { id: 'landscape', label: 'Landscape', icon: <SheetIcon wide /> },
];

const MARGINS: readonly SegmentOption<Margin>[] = [
  { id: 'none', label: 'None' },
  { id: 'small', label: 'Small' },
  { id: 'large', label: 'Large' },
];

/** Images to PDF: order photos, pick a page layout, build the PDF in a worker. */
export function ImagesTool({ tool }: { tool: ToolInfo }) {
  const queue = useFileQueue(tool.id);
  const { job: work, clock, start, reset } = useImagesJob();
  const story = useStory(work, clock, STEPS);
  const job = story.job;
  const photos = useThumbnails(job.status === 'running' ? queue.items.map((i) => i.file) : []);
  const still = useStillMotion();
  const [options, setOptions] = useState<ImagesOptions>(DEFAULT_OPTIONS);
  const count = queue.items.length;

  const run = () => start({ files: queue.items.map((i) => i.file), options });
  const startOver = () => {
    reset();
    queue.clear();
  };

  const swap = still
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 18, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -10, scale: 0.98 },
      };
  const transition = { duration: 0.22 };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {job.status === 'idle' ? (
        <motion.div key="files" {...swap} transition={transition}>
          <ToolWorkbench
            tool={tool}
            queue={queue}
            footer={
              count > 0 ? (
                <LayoutPanel
                  items={queue.items}
                  accent={tool.accent}
                  options={options}
                  onChange={setOptions}
                  onMake={run}
                />
              ) : null
            }
          />
        </motion.div>
      ) : (
        <motion.div
          key={job.status}
          {...swap}
          transition={transition}
          className="mt-12 max-w-xl sm:mt-16"
        >
          {job.status === 'running' ? (
            <WaitStage
              title={`Making a PDF of ${imagesWord(count)}`}
              steps={STEPS}
              current={job.stage}
              progress={job.progress}
              accent={tool.accent}
              onSkip={story.skip}
              canSkip={story.canSkip}
              scene={
                <ScrapbookScene accent={tool.accent} progress={story.progress} photos={photos} />
              }
            />
          ) : job.status === 'done' ? (
            <DoneCard
              accent={tool.accent}
              title="Your PDF is ready"
              fileName={job.name}
              blob={job.blob}
              details={`${pagesWord(job.pages)}, ${formatBytes(job.blob.size)}.`}
              downloadLabel="Download PDF"
              actions={[
                { label: 'Use other images', onClick: startOver },
                { label: 'Change the layout', onClick: reset },
              ]}
            />
          ) : (
            <ErrorCard
              reason={job.reason}
              title="The PDF was not made"
              message={job.message}
              fileName={job.fileName}
              onRetry={run}
              onBack={reset}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface LayoutPanelProps {
  items: readonly QueuedFile[];
  accent: Accent;
  options: ImagesOptions;
  onChange: (options: ImagesOptions) => void;
  onMake: () => void;
}

function LayoutPanel({ items, accent, options, onChange, onMake }: LayoutPanelProps) {
  const [shown, setShown] = useState(0);
  const at = Math.min(shown, items.length - 1);
  const item = items[at];
  const hintId = useId();
  const fit = options.size === 'fit';
  const set = <K extends keyof ImagesOptions>(key: K, value: ImagesOptions[K]) =>
    onChange({ ...options, [key]: value });

  return (
    <div className="rounded-panel border border-line bg-surface p-5 shadow-soft backdrop-blur-xl sm:p-7">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-8">
        <figure className="flex shrink-0 flex-col items-center">
          {item ? (
            <PagePreview
              key={item.id}
              file={item.file}
              options={options}
              accent={accent}
              behind={items.length - 1 - at}
            />
          ) : null}
          <figcaption className="mt-2 flex items-center gap-1 text-sm text-muted">
            <PreviewStep
              label="Show the previous page"
              disabled={at === 0}
              onClick={() => setShown(at - 1)}
              back
            />
            <span aria-live="polite" className="min-w-24 text-center tabular-nums">
              Page {at + 1} of {items.length}
            </span>
            <PreviewStep
              label="Show the next page"
              disabled={at >= items.length - 1}
              onClick={() => setShown(at + 1)}
            />
          </figcaption>
        </figure>

        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <h2 className="font-display text-xl font-bold tracking-tight">Page layout</h2>
          <Segmented
            legend="Page size"
            options={SIZES}
            value={options.size}
            onChange={(v) => set('size', v)}
            accent={accent}
          />
          <Segmented
            legend="Orientation"
            options={ORIENTATIONS}
            value={options.orientation}
            onChange={(v) => set('orientation', v)}
            accent={accent}
            disabled={fit}
            hint={
              fit
                ? 'Each page takes the shape of its image.'
                : options.orientation === 'auto'
                  ? 'Wide images get landscape pages, tall ones portrait.'
                  : undefined
            }
          />
          <Segmented
            legend="Margin"
            options={MARGINS}
            value={options.margin}
            onChange={(v) => set('margin', v)}
            accent={accent}
          />
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p id={hintId} className="text-muted">
          {items.length === 1
            ? 'Your image goes on one page.'
            : `Each image gets its own page, top of the list first.`}
        </p>
        <Button
          variant="accent"
          accent={accent}
          size="lg"
          onClick={onMake}
          aria-describedby={hintId}
          className="shrink-0"
          icon={<AlbumIcon />}
        >
          {items.length === 1 ? 'Make PDF' : `Make a ${items.length}-page PDF`}
        </Button>
      </div>
    </div>
  );
}

function PreviewStep({
  label,
  disabled,
  onClick,
  back,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  back?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-9 place-items-center rounded-full transition-colors hover:bg-surface-strong hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent"
    >
      <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
        <path
          d={back ? 'M10 3 5 8l5 5' : 'M6 3l5 5-5 5'}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function SheetIcon({ wide }: { wide: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className="hidden size-4 sm:block"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      {wide ? (
        <rect x="3" y="5.5" width="14" height="9" rx="1.6" />
      ) : (
        <rect x="5.5" y="3" width="9" height="14" rx="1.6" />
      )}
    </svg>
  );
}

function AlbumIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="size-full"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    >
      <path d="M10 5.5C8.5 4.3 6.3 4 3.5 4.3v11c2.8-.3 5 0 6.5 1.2 1.5-1.2 3.7-1.5 6.5-1.2v-11c-2.8-.3-5 0-6.5 1.2Z" />
      <path d="M10 5.5v11" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}
