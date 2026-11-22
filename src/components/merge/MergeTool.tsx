import { AnimatePresence, motion } from 'framer-motion';
import { useId } from 'react';
import { mergedName } from '../../lib/pdf/merge';
import type { ToolInfo } from '../../tools';
import { useStillMotion } from '../../useStillMotion';
import { useMergeJob } from '../../workers/useMergeJob';
import { ToolWorkbench } from '../drop/ToolWorkbench';
import { useFileQueue } from '../drop/useFileQueue';
import { formatBytes } from '../drop/validate';
import { DoneCard } from '../result/DoneCard';
import { ErrorCard } from '../result/ErrorCard';
import { Button } from '../ui';
import type { Accent } from '../ui/accent';
import { type WaitStep } from '../wait/progress';
import { useStory } from '../wait/useStory';
import { useThumbnails } from '../wait/useThumbnails';
import { JarScene } from '../wait/scenes/JarScene';
import { WaitStage } from '../wait/WaitStage';

const pageCount = (n: number) => (n === 1 ? '1 page' : `${n} pages`);

/** Past this, phones and older laptops can run out of memory mid merge. */
export const BIG_BATCH_BYTES = 400 * 1024 * 1024;

const STEPS: readonly WaitStep[] = [
  { id: 'reading', label: 'Reading your PDFs' },
  { id: 'working', label: 'Joining the pages' },
  { id: 'packing', label: 'Saving the new file' },
];

/** Merge PDF: gather files, join them in a worker, hand back one download. */
export function MergeTool({ tool }: { tool: ToolInfo }) {
  const queue = useFileQueue(tool.id);
  const { job: work, clock, start, reset } = useMergeJob(undefined, queue.items.length > 0);
  const story = useStory(work, clock, STEPS);
  const job = story.job;
  const thumbs = useThumbnails(job.status === 'running' ? queue.items.map((i) => i.file) : []);
  const still = useStillMotion();
  const count = queue.items.length;
  const totalBytes = queue.items.reduce((sum, item) => sum + item.file.size, 0);
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
            footer={
              <MergeAction
                count={count}
                totalBytes={totalBytes}
                accent={tool.accent}
                onMerge={run}
              />
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
              title={`Merging ${count} PDFs`}
              steps={STEPS}
              current={job.stage}
              progress={job.progress}
              accent={tool.accent}
              onSkip={story.skip}
              canSkip={story.canSkip}
              scene={<JarScene accent={tool.accent} progress={story.progress} thumbs={thumbs} />}
            />
          ) : job.status === 'done' ? (
            <DoneCard
              accent={tool.accent}
              title="Your PDF is ready"
              fileName={name}
              blob={job.blob}
              details={`${count} files joined, ${pageCount(job.pages)}, ${formatBytes(job.blob.size)}.`}
              downloadLabel="Download PDF"
              actions={[
                { label: 'Merge other PDFs', onClick: startOver },
                { label: 'Change the order', onClick: reset },
              ]}
            />
          ) : (
            <ErrorCard
              reason={job.reason}
              title="The merge did not finish"
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
  totalBytes,
  accent,
  onMerge,
}: {
  count: number;
  totalBytes: number;
  accent: Accent;
  onMerge: () => void;
}) {
  const hintId = useId();
  const ready = count >= 2;
  const big = ready && totalBytes > BIG_BATCH_BYTES;
  return (
    <div className="flex flex-col gap-4 rounded-panel border border-line bg-surface p-5 shadow-soft backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div id={hintId} className="text-muted">
        <p>
          {ready
            ? `The pages of all ${count} files go into one PDF, top file first.`
            : 'Add at least one more PDF to merge.'}
        </p>
        {big && (
          <p className="mt-1.5 text-sm">
            That is {formatBytes(totalBytes)} in all. If your browser runs out of memory, merge them
            in two or three smaller batches.
          </p>
        )}
      </div>
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
