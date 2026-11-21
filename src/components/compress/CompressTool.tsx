import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import type { CompressLevel } from '../../lib/pdf/compress';
import type { ToolInfo } from '../../tools';
import { useStillMotion } from '../../useStillMotion';
import { useCompressJob } from '../../workers/useCompressJob';
import { ToolWorkbench } from '../drop/ToolWorkbench';
import { useFileQueue } from '../drop/useFileQueue';
import { formatBytes } from '../drop/validate';
import { DoneCard } from '../result/DoneCard';
import { ErrorCard } from '../result/ErrorCard';
import { Button } from '../ui';
import type { Accent } from '../ui/accent';
import { Segmented, type SegmentOption } from '../ui/Segmented';
import { type WaitStep } from '../wait/progress';
import { useStory } from '../wait/useStory';
import { useThumbnails } from '../wait/useThumbnails';
import { SuitcaseScene } from '../wait/scenes/SuitcaseScene';
import { WaitStage } from '../wait/WaitStage';
import { SizeCompare } from './SizeCompare';

const STEPS: readonly WaitStep[] = [
  { id: 'reading', label: 'Reading your PDF' },
  { id: 'working', label: 'Squeezing the photos' },
  { id: 'packing', label: 'Packing the smaller copy' },
];

const LEVEL_OPTIONS: readonly SegmentOption<CompressLevel>[] = [
  { id: 'light', label: 'Light' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'strong', label: 'Strong' },
];

/** One line per level saying what it does to the file. */
const LEVEL_HINTS: Record<CompressLevel, string> = {
  light: 'Tidies the file and drops hidden extras. Photos stay exactly as they are.',
  balanced: 'Also re-saves large photos at print-friendly quality. Best for most files.',
  strong: 'Smallest file. Photos get softer, fine for reading on screen.',
};

/** Compress PDF: pick a level, shrink it in a worker, show old vs new size. */
export function CompressTool({ tool }: { tool: ToolInfo }) {
  const queue = useFileQueue(tool.id);
  const { job: work, clock, start, reset } = useCompressJob();
  const story = useStory(work, clock, STEPS);
  const job = story.job;
  const still = useStillMotion();
  const file = queue.items[0]?.file;
  const [thumb] = useThumbnails(job.status === 'running' && file ? [file] : [], 1);
  const [level, setLevel] = useState<CompressLevel>('balanced');

  const run = () => {
    if (file) start({ file, level });
  };
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
              file ? (
                <CompressPanel
                  file={file}
                  accent={tool.accent}
                  level={level}
                  onLevelChange={setLevel}
                  onCompress={run}
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
              title={`Shrinking ${file?.name ?? 'your PDF'}`}
              steps={STEPS}
              current={job.stage}
              progress={job.progress}
              accent={tool.accent}
              onSkip={story.skip}
              canSkip={story.canSkip}
              scene={<SuitcaseScene accent={tool.accent} progress={story.progress} thumb={thumb} />}
            />
          ) : job.status === 'done' ? (
            job.smaller ? (
              <DoneCard
                accent={tool.accent}
                title="Your PDF is smaller"
                fileName={job.name}
                blob={job.blob}
                details={
                  job.shrunk > 0
                    ? `${job.shrunk} ${job.shrunk === 1 ? 'photo' : 'photos'} re-saved.`
                    : 'Hidden extras removed.'
                }
                extra={<SizeCompare before={job.before} after={job.after} accent={tool.accent} />}
                downloadLabel="Download PDF"
                actions={[
                  { label: 'Compress another PDF', onClick: startOver },
                  { label: 'Try another level', onClick: reset },
                ]}
              />
            ) : (
              <DoneCard
                accent={tool.accent}
                title="This PDF is already lean"
                fileName={file?.name ?? job.name}
                blob={job.blob}
                details={`It could not get any smaller at this level, so here is your original, ${formatBytes(job.before)}.`}
                downloadLabel="Download original"
                actions={[
                  ...(level === 'strong' ? [] : [{ label: 'Try Strong', onClick: reset }]),
                  { label: 'Compress another PDF', onClick: startOver },
                ]}
              />
            )
          ) : (
            <ErrorCard
              reason={job.reason}
              title="Your PDF was not compressed"
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

interface CompressPanelProps {
  file: File;
  accent: Accent;
  level: CompressLevel;
  onLevelChange: (level: CompressLevel) => void;
  onCompress: () => void;
}

function CompressPanel({ file, accent, level, onLevelChange, onCompress }: CompressPanelProps) {
  return (
    <div className="rounded-panel border border-line bg-surface p-5 shadow-soft backdrop-blur-xl sm:p-7">
      <h2 className="font-display text-xl font-bold tracking-tight">How small?</h2>
      <p className="mt-1 mb-5 text-sm text-muted">
        Squeezed right here in your browser. If it cannot get smaller you keep the original.
      </p>
      <Segmented
        legend="Compression level"
        hideLegend
        options={LEVEL_OPTIONS}
        value={level}
        onChange={onLevelChange}
        accent={accent}
        hint={LEVEL_HINTS[level]}
      />
      <div className="mt-8 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted">
          {file.name} is {formatBytes(file.size)}. It stays as it is.
        </p>
        <Button
          variant="accent"
          accent={accent}
          size="lg"
          onClick={onCompress}
          className="shrink-0"
          icon={<SqueezeIcon />}
        >
          Compress PDF
        </Button>
      </div>
    </div>
  );
}

/** Two arrows pressing a page flat. */
function SqueezeIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true">
      <path
        d="M10 1.5v5m0 0L7.5 4M10 6.5 12.5 4M10 18.5v-5m0 0L7.5 16m2.5-2.5 2.5 2.5M4 10h12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
