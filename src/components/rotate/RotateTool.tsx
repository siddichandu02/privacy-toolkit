import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NO_EDIT, toDegrees, type PageEdit } from '../../lib/pdf/rotate';
import type { ToolInfo } from '../../tools';
import { useStillMotion } from '../../useStillMotion';
import { useRotateJob } from '../../workers/useRotateJob';
import { ToolWorkbench } from '../drop/ToolWorkbench';
import { useFileQueue } from '../drop/useFileQueue';
import { formatBytes } from '../drop/validate';
import { usePdfPages } from '../pages/usePdfPages';
import { DoneCard } from '../result/DoneCard';
import { ErrorCard } from '../result/ErrorCard';
import { Button } from '../ui';
import type { Accent } from '../ui/accent';
import { type WaitStep } from '../wait/progress';
import { useStory } from '../wait/useStory';
import { PizzaScene } from '../wait/scenes/PizzaScene';
import { useThumbnails } from '../wait/useThumbnails';
import { WaitStage } from '../wait/WaitStage';
import { PageTurner, TurnIcon, UndoIcon } from './PageTurner';

const pagesWord = (n: number) => (n === 1 ? '1 page' : `${n} pages`);

const STEPS: readonly WaitStep[] = [
  { id: 'reading', label: 'Reading your PDF' },
  { id: 'working', label: 'Spinning the pages' },
  { id: 'packing', label: 'Saving the new file' },
];

type Edits = (PageEdit | undefined)[];

/** What the edits add up to, for labels and the save button. */
function tally(edits: Edits, count: number) {
  let turned = 0;
  let removed = 0;
  for (let i = 0; i < count; i++) {
    const e = edits[i] ?? NO_EDIT;
    if (!e.keep) removed++;
    else if (toDegrees(e.turns)) turned++;
  }
  return { turned, removed, kept: count - removed };
}

/** Rotate pages: turn and drop pages on a thumbnail grid, then save in a worker. */
export function RotateTool({ tool }: { tool: ToolInfo }) {
  const queue = useFileQueue(tool.id);
  const { job: work, clock, start, reset } = useRotateJob(undefined, queue.items.length > 0);
  const story = useStory(work, clock, STEPS);
  const job = story.job;
  const still = useStillMotion();
  const item = queue.items[0];
  const file = item?.file;
  const [thumb] = useThumbnails(job.status === 'running' && file ? [file] : [], 1);
  // Edits belong to one file; a new file starts fresh.
  const [held, setHeld] = useState<{ id: string; edits: Edits }>({ id: '', edits: [] });
  const edits = item && held.id === item.id ? held.edits : [];
  const setEdits = (next: Edits) => setHeld({ id: item?.id ?? '', edits: next });
  const [last, setLast] = useState<PageEdit[]>([]);

  const run = (list: PageEdit[]) => {
    if (!file) return;
    setLast(list);
    start({ file, edits: list });
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
  const onlyRemoving = last.length > 0 && last.every((e) => !e.keep || !toDegrees(e.turns));

  // Long page grids push the wait card off screen; bring it back up.
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
                  <RotatePanel
                    file={file}
                    accent={tool.accent}
                    edits={edits}
                    onEditsChange={setEdits}
                    onSave={run}
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
                title={onlyRemoving ? 'Removing your pages' : 'Turning your pages'}
                steps={STEPS}
                current={job.stage}
                progress={job.progress}
                accent={tool.accent}
                onSkip={story.skip}
                canSkip={story.canSkip}
                scene={<PizzaScene accent={tool.accent} progress={story.progress} thumb={thumb} />}
              />
            ) : job.status === 'done' ? (
              <DoneCard
                accent={tool.accent}
                title="Your PDF is ready"
                fileName={job.name}
                blob={job.blob}
                details={[
                  pagesWord(job.pages),
                  job.rotated ? `${job.rotated} turned` : null,
                  job.removed ? `${job.removed} removed` : null,
                  formatBytes(job.blob.size),
                ]
                  .filter(Boolean)
                  .join(', ')
                  .concat('.')}
                downloadLabel="Download PDF"
                actions={[
                  { label: 'Rotate another PDF', onClick: startOver },
                  { label: 'Keep editing', onClick: reset },
                ]}
              />
            ) : (
              <ErrorCard
                reason={job.reason}
                title="Your pages were not saved"
                message={job.message}
                fileName={job.fileName}
                onRetry={() => run(last)}
                onBack={reset}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface RotatePanelProps {
  file: File;
  accent: Accent;
  edits: Edits;
  onEditsChange: (edits: Edits) => void;
  onSave: (edits: PageEdit[]) => void;
}

function RotatePanel({ file, accent, edits, onEditsChange, onSave }: RotatePanelProps) {
  const doc = usePdfPages(file);
  const count = doc.status === 'ready' ? doc.pages.count : 0;
  const [said, setSaid] = useState('');
  const { turned, removed, kept } = tally(edits, count);
  const changed = turned + removed > 0;
  const ready = changed && kept > 0;

  const at = (i: number) => edits[i] ?? NO_EDIT;
  const turn = (i: number, by: 1 | -1) => {
    const e = at(i);
    if (!e.keep) return;
    const next = [...edits];
    next[i] = { ...e, turns: e.turns + by };
    onEditsChange(next);
    const angle = toDegrees(e.turns + by);
    setSaid(angle ? `Page ${i + 1} turned to ${angle} degrees.` : `Page ${i + 1} is upright.`);
  };
  const toggleKeep = (i: number) => {
    const e = at(i);
    const next = [...edits];
    next[i] = { ...e, keep: !e.keep };
    onEditsChange(next);
    setSaid(e.keep ? `Page ${i + 1} removed.` : `Page ${i + 1} kept.`);
  };
  const turnAll = (by: 1 | -1) => {
    onEditsChange(
      Array.from({ length: count }, (_, i) => {
        const e = at(i);
        return e.keep ? { ...e, turns: e.turns + by } : e;
      }),
    );
    setSaid(`Every page turned ${by === 1 ? 'right' : 'left'}.`);
  };
  const undoAll = () => {
    // Snap back by the shortest way, so pages spin home rather than unwinding.
    onEditsChange(
      Array.from({ length: count }, (_, i) => {
        const t = at(i).turns;
        return { turns: Math.round(t / 4) * 4, keep: true };
      }),
    );
    setSaid('All changes undone.');
  };

  if (doc.status === 'error') {
    return (
      <p role="alert" className="rounded-panel border border-coral/30 bg-coral/10 p-5 text-fg">
        {file.name} could not be opened. It may be damaged or password protected.
      </p>
    );
  }

  return (
    <div className="rounded-panel border border-line bg-surface p-5 shadow-soft backdrop-blur-xl sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">Turn or remove pages</h2>
          <p className="mt-1 text-sm text-muted">
            {doc.status !== 'ready'
              ? 'Opening the pages...'
              : changed
                ? [
                    turned ? `${pagesWord(turned)} turned` : null,
                    removed ? `${pagesWord(removed)} removed` : null,
                  ]
                    .filter(Boolean)
                    .join(', ') + ` of ${count}.`
                : `${pagesWord(count)}. Focus a page and press R to turn it, Delete to remove it.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm font-semibold">
          <Chip onClick={() => turnAll(-1)} disabled={!count || kept === 0}>
            <TurnIcon dir={-1} />
            All left
          </Chip>
          <Chip onClick={() => turnAll(1)} disabled={!count || kept === 0}>
            <TurnIcon dir={1} />
            All right
          </Chip>
          <Chip onClick={undoAll} disabled={!changed}>
            <UndoIcon />
            Undo all
          </Chip>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {said}
      </p>

      <div className="mt-5">
        {doc.status === 'ready' ? (
          <PageTurner
            pages={doc.pages}
            accent={accent}
            edits={edits}
            onTurn={turn}
            onToggleKeep={toggleKeep}
          />
        ) : (
          <div
            className="grid grid-cols-2 gap-4 min-[420px]:grid-cols-3 md:grid-cols-4"
            aria-hidden="true"
          >
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-2xl bg-line" />
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className={changed && kept === 0 ? 'font-semibold text-coral' : 'text-muted'}>
          {!changed
            ? 'Turn or remove a page to begin.'
            : kept === 0
              ? 'Keep at least one page. A PDF cannot be empty.'
              : `The new PDF has ${pagesWord(kept)}. ${file.name} stays as it is.`}
        </p>
        <Button
          variant="accent"
          accent={accent}
          size="lg"
          onClick={() => onSave(Array.from({ length: count }, (_, i) => ({ ...at(i) })))}
          disabled={!ready}
          className="shrink-0"
          icon={<TurnIcon dir={1} />}
        >
          Save PDF
        </Button>
      </div>
    </div>
  );
}

function Chip({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-full border border-line py-1.5 pr-3.5 pl-3 text-muted transition-colors hover:border-line-strong hover:text-fg disabled:opacity-40 disabled:hover:border-line disabled:hover:text-muted"
    >
      {children}
    </button>
  );
}
