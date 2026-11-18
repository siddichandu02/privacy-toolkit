import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useId, useRef } from 'react';
import { mergedName } from '../../lib/pdf/merge';
import type { ToolInfo } from '../../tools';
import { useStillMotion } from '../../useStillMotion';
import { useMergeJob } from '../../workers/useMergeJob';
import { ToolWorkbench } from '../drop/ToolWorkbench';
import { useFileQueue } from '../drop/useFileQueue';
import { formatBytes } from '../drop/validate';
import { Pip } from '../pip/Pip';
import { Button } from '../ui';
import { accentButtonGlow, accentFill, accentText, type Accent } from '../ui/accent';
import { overallProgress, type WaitStep } from '../wait/progress';
import { PancakeScene } from '../wait/scenes/PancakeScene';
import { WaitStage } from '../wait/WaitStage';
import { useObjectUrl } from './useObjectUrl';

const STEPS: readonly WaitStep[] = [
  { id: 'reading', label: 'Reading your PDFs' },
  { id: 'working', label: 'Joining the pages' },
  { id: 'packing', label: 'Saving the new file' },
];

/** Pip is never violet on a violet page; coral reads better there. */
const pipFor = (accent: Accent): Accent => (accent === 'violet' ? 'coral' : accent);

/** Merge PDF: gather files, join them in a worker, hand back one download. */
export function MergeTool({ tool }: { tool: ToolInfo }) {
  const queue = useFileQueue();
  const { job, start, reset } = useMergeJob();
  const still = useStillMotion();
  const count = queue.items.length;
  const name = mergedName(queue.items[0]?.file.name);

  const run = () => start(queue.items.map((item) => item.file));
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
            footer={<MergeAction count={count} accent={tool.accent} onMerge={run} />}
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
              title={`Merging ${count} PDFs`}
              steps={STEPS}
              current={job.stage}
              progress={job.progress}
              accent={tool.accent}
              scene={
                <PancakeScene
                  accent={tool.accent}
                  progress={overallProgress(STEPS, job.stage, job.progress)}
                />
              }
            />
          ) : job.status === 'done' ? (
            <MergeDone
              accent={tool.accent}
              blob={job.blob}
              name={name}
              count={count}
              onAgain={startOver}
              onBack={reset}
            />
          ) : (
            <MergeFailed
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

function MergeAction({
  count,
  accent,
  onMerge,
}: {
  count: number;
  accent: Accent;
  onMerge: () => void;
}) {
  const hintId = useId();
  const ready = count >= 2;
  return (
    <div className="flex flex-col gap-4 rounded-panel border border-line bg-surface p-5 shadow-soft backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <p id={hintId} className="text-muted">
        {ready
          ? `The pages of all ${count} files go into one PDF, top file first.`
          : 'Add at least one more PDF to merge.'}
      </p>
      <Button
        variant="accent"
        accent={accent}
        size="lg"
        onClick={onMerge}
        disabled={!ready}
        aria-describedby={hintId}
        className="shrink-0"
        icon={<StackIcon />}
      >
        {ready ? `Merge ${count} PDFs` : 'Merge PDFs'}
      </Button>
    </div>
  );
}

/** Puts keyboard and screen reader focus on a result heading when it appears. */
function useFocusOnMount<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => ref.current?.focus(), []);
  return ref;
}

const panel =
  'relative overflow-hidden rounded-panel border border-line bg-surface px-6 py-8 text-center shadow-lifted backdrop-blur-xl sm:px-10 sm:py-10';

function MergeDone({
  accent,
  blob,
  name,
  count,
  onAgain,
  onBack,
}: {
  accent: Accent;
  blob: Blob;
  name: string;
  count: number;
  onAgain: () => void;
  onBack: () => void;
}) {
  const url = useObjectUrl(blob);
  const heading = useFocusOnMount<HTMLHeadingElement>();
  return (
    <section aria-labelledby="merge-done" className={panel}>
      <Pip pose="wave" accent={pipFor(accent)} className="mx-auto h-32" />
      <h2
        id="merge-done"
        ref={heading}
        tabIndex={-1}
        className="mt-5 font-display text-3xl font-bold tracking-tight text-balance outline-none sm:text-4xl"
      >
        Your PDF is ready
      </h2>
      <p className="mt-3 text-muted">
        <span className={`font-semibold break-all ${accentText[accent]}`}>{name}</span>
        <br />
        {count} files joined, {formatBytes(blob.size)}. Made on this device, never uploaded.
      </p>
      <a
        href={url ?? undefined}
        download={name}
        className={`mt-7 inline-flex h-14 items-center justify-center gap-2.5 rounded-[1.125rem] px-8 text-lg font-semibold shadow-soft transition-[box-shadow,translate,scale] duration-200 hover:-translate-y-0.5 active:scale-95 ${accentFill[accent]} ${accentButtonGlow[accent]}`}
      >
        <DownloadIcon />
        Download PDF
      </a>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-semibold">
        <button
          type="button"
          onClick={onAgain}
          className="rounded-lg text-muted transition-colors hover:text-fg"
        >
          Merge other PDFs
        </button>
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg text-muted transition-colors hover:text-fg"
        >
          Change the order
        </button>
      </div>
    </section>
  );
}

function MergeFailed({
  message,
  fileName,
  onRetry,
  onBack,
}: {
  message: string;
  /** Set when one file is to blame. Retrying would fail again, so going back leads. */
  fileName?: string;
  onRetry: () => void;
  onBack: () => void;
}) {
  const heading = useFocusOnMount<HTMLHeadingElement>();
  const retry = (
    <Button key="retry" variant={fileName ? 'ghost' : 'primary'} onClick={onRetry}>
      Try again
    </Button>
  );
  const back = (
    <Button key="back" variant={fileName ? 'primary' : 'ghost'} onClick={onBack}>
      Back to your files
    </Button>
  );
  return (
    <section role="alert" aria-labelledby="merge-failed" className={panel}>
      <Pip pose="puzzled" className="mx-auto h-32" />
      <h2
        id="merge-failed"
        ref={heading}
        tabIndex={-1}
        className="mt-5 font-display text-3xl font-bold tracking-tight outline-none"
      >
        The merge did not finish
      </h2>
      <p className="mx-auto mt-3 max-w-md text-muted">{message}</p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        {fileName ? [back, retry] : [retry, back]}
      </div>
    </section>
  );
}

function StackIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="size-full"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    >
      <path d="M4 7.5 10 4l6 3.5-6 3.5z" />
      <path d="m4 11 6 3.5 6-3.5" strokeLinecap="round" />
      <path d="m4 14.5 6 3.5 6-3.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 3v10m-4-4 4 4 4-4M4 16.5h12" />
    </svg>
  );
}
