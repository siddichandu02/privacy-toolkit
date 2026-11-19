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
import { overallProgress, type WaitStep } from '../wait/progress';
import { PancakeScene } from '../wait/scenes/PancakeScene';
import { WaitStage } from '../wait/WaitStage';

const STEPS: readonly WaitStep[] = [
  { id: 'reading', label: 'Reading your PDFs' },
  { id: 'working', label: 'Joining the pages' },
  { id: 'packing', label: 'Saving the new file' },
];

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
            <DoneCard
              accent={tool.accent}
              title="Your PDF is ready"
              fileName={name}
              blob={job.blob}
              details={`${count} files joined, ${formatBytes(job.blob.size)}.`}
              downloadLabel="Download PDF"
              actions={[
                { label: 'Merge other PDFs', onClick: startOver },
                { label: 'Change the order', onClick: reset },
              ]}
            />
          ) : (
            <ErrorCard
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
