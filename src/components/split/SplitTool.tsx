import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { SplitMode, SplitPlan } from '../../lib/pdf/split-plan';
import type { ToolInfo } from '../../tools';
import { useStillMotion } from '../../useStillMotion';
import { useSplitJob } from '../../workers/useSplitJob';
import { ToolWorkbench } from '../drop/ToolWorkbench';
import { useFileQueue } from '../drop/useFileQueue';
import { formatBytes } from '../drop/validate';
import { DoneCard } from '../result/DoneCard';
import { ErrorCard } from '../result/ErrorCard';
import { ZipContents } from '../result/ZipContents';
import { type WaitStep } from '../wait/progress';
import { useStory } from '../wait/useStory';
import { useThumbnails } from '../wait/useThumbnails';
import { BreadScene } from '../wait/scenes/BreadScene';
import { WaitStage } from '../wait/WaitStage';
import { SplitPanel } from './SplitPanel';

const pagesWord = (n: number) => (n === 1 ? '1 page' : `${n} pages`);
const pdfsWord = (n: number) => (n === 1 ? '1 PDF' : `${n} PDFs`);

const STEPS: readonly WaitStep[] = [
  { id: 'reading', label: 'Reading your PDF' },
  { id: 'working', label: 'Slicing out the pages' },
  { id: 'packing', label: 'Saving the new files' },
];

/**
 * Split PDF: extract pages into one file, split into parts, or split every
 * page. The panel plans the files; the worker makes them.
 */
export function SplitTool({ tool }: { tool: ToolInfo }) {
  const queue = useFileQueue(tool.id);
  const { job: work, clock, start, reset } = useSplitJob(undefined, queue.items.length > 0);
  const story = useStory(work, clock, STEPS);
  const job = story.job;
  const still = useStillMotion();
  const item = queue.items[0];
  const file = item?.file;
  const [thumb] = useThumbnails(job.status === 'running' && file ? [file] : [], 1);
  // Typed pages belong to one file; a new file starts with a clean slate.
  const [picks, setPicks] = useState({ id: '', text: '' });
  const text = item && picks.id === item.id ? picks.text : '';
  const setText = (next: string) => setPicks({ id: item?.id ?? '', text: next });
  const [mode, setMode] = useState<SplitMode>('extract');
  const [lastPlan, setLastPlan] = useState<SplitPlan | null>(null);

  const run = (plan: SplitPlan | null) => {
    if (!file || !plan) return;
    setLastPlan(plan);
    start({ file, files: plan.files, zipName: plan.zipName });
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
  const outputs = lastPlan?.files.length ?? 0;

  // The page picker can be long. When the job starts, bring the wait and done
  // cards up to where the tool begins instead of leaving them off screen.
  const top = useRef<HTMLDivElement>(null);
  const busy = job.status !== 'idle';
  useEffect(() => {
    const el = top.current;
    if (!busy || !el || el.getBoundingClientRect().top >= 0) return;
    el.scrollIntoView({ block: 'start', behavior: still ? 'auto' : 'smooth' });
  }, [busy, still]);

  return (
    <div ref={top} className="scroll-mt-24">
      <AnimatePresence mode="wait" initial={false}>
        {job.status === 'idle' ? (
          <motion.div key="files" {...swap} transition={transition}>
            <ToolWorkbench
              tool={tool}
              queue={queue}
              footer={
                file ? (
                  <SplitPanel
                    file={file}
                    accent={tool.accent}
                    text={text}
                    onTextChange={setText}
                    mode={mode}
                    onModeChange={setMode}
                    onSplit={run}
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
                title={outputs > 1 ? `Splitting into ${outputs} PDFs` : 'Pulling out your pages'}
                steps={STEPS}
                current={job.stage}
                progress={job.progress}
                accent={tool.accent}
                onSkip={story.skip}
                canSkip={story.canSkip}
                scene={<BreadScene accent={tool.accent} progress={story.progress} thumb={thumb} />}
              />
            ) : job.status === 'done' ? (
              <DoneCard
                accent={tool.accent}
                title={job.files > 1 ? 'Your PDFs are ready' : 'Your PDF is ready'}
                fileName={job.name}
                blob={job.blob}
                details={
                  job.files > 1
                    ? `${pdfsWord(job.files)} in one zip, ${pagesWord(job.pages)} in all, ${formatBytes(job.blob.size)}.`
                    : `${pagesWord(job.pages)}, ${formatBytes(job.blob.size)}.`
                }
                extra={
                  job.files > 1 && lastPlan ? (
                    <ZipContents
                      blob={job.blob}
                      accent={tool.accent}
                      items={lastPlan.files.map((f) => ({ name: f.name, detail: f.label }))}
                    />
                  ) : null
                }
                downloadLabel={job.files > 1 ? 'Download zip' : 'Download PDF'}
                actions={[
                  { label: 'Split another PDF', onClick: startOver },
                  { label: 'Pick other pages', onClick: reset },
                ]}
              />
            ) : (
              <ErrorCard
                reason={job.reason}
                title="The split did not finish"
                message={job.message}
                fileName={job.fileName}
                onRetry={() => run(lastPlan)}
                onBack={reset}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
