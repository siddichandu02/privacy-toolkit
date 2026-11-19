import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import { formatPages, pagesIn, parseRanges, type PageRange } from '../../lib/pdf/ranges';
import type { SplitMode } from '../../lib/pdf/split';
import type { ToolInfo } from '../../tools';
import { useStillMotion } from '../../useStillMotion';
import { useSplitJob } from '../../workers/useSplitJob';
import { ToolWorkbench } from '../drop/ToolWorkbench';
import { useFileQueue } from '../drop/useFileQueue';
import { formatBytes } from '../drop/validate';
import { DoneCard } from '../result/DoneCard';
import { ErrorCard } from '../result/ErrorCard';
import { Button } from '../ui';
import type { Accent } from '../ui/accent';
import { overallProgress, type WaitStep } from '../wait/progress';
import { BreadScene } from '../wait/scenes/BreadScene';
import { WaitStage } from '../wait/WaitStage';
import { PagePicker } from './PagePicker';
import { usePdfPages } from './usePdfPages';

const pagesWord = (n: number) => (n === 1 ? '1 page' : `${n} pages`);
const pdfsWord = (n: number) => (n === 1 ? '1 PDF' : `${n} PDFs`);

const STEPS: readonly WaitStep[] = [
  { id: 'reading', label: 'Reading your PDF' },
  { id: 'working', label: 'Slicing out the pages' },
  { id: 'packing', label: 'Saving the new files' },
];

/** Split PDF: pick pages on a grid or by typing ranges, then cut them out in a worker. */
export function SplitTool({ tool }: { tool: ToolInfo }) {
  const queue = useFileQueue();
  const { job, start, reset } = useSplitJob();
  const still = useStillMotion();
  const item = queue.items[0];
  const file = item?.file;
  // Typed pages belong to one file; a new file starts with a clean slate.
  const [picks, setPicks] = useState({ id: '', text: '' });
  const text = item && picks.id === item.id ? picks.text : '';
  const setText = (next: string) => setPicks({ id: item?.id ?? '', text: next });
  const [mode, setMode] = useState<SplitMode>('extract');
  const [lastRanges, setLastRanges] = useState<PageRange[]>([]);

  const run = (ranges: PageRange[]) => {
    if (!file) return;
    setLastRanges(ranges);
    start({ file, ranges, mode });
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
  const several = mode === 'separate' && lastRanges.length > 1;

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
                title={
                  several ? `Splitting into ${lastRanges.length} PDFs` : 'Pulling out your pages'
                }
                steps={STEPS}
                current={job.stage}
                progress={job.progress}
                accent={tool.accent}
                scene={
                  <BreadScene
                    accent={tool.accent}
                    progress={overallProgress(STEPS, job.stage, job.progress)}
                  />
                }
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
                downloadLabel={job.files > 1 ? 'Download zip' : 'Download PDF'}
                actions={[
                  { label: 'Split another PDF', onClick: startOver },
                  { label: 'Pick other pages', onClick: reset },
                ]}
              />
            ) : (
              <ErrorCard
                title="The split did not finish"
                message={job.message}
                fileName={job.fileName}
                onRetry={() => run(lastRanges)}
                onBack={reset}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface SplitPanelProps {
  file: File;
  accent: Accent;
  text: string;
  onTextChange: (text: string) => void;
  mode: SplitMode;
  onModeChange: (mode: SplitMode) => void;
  onSplit: (ranges: PageRange[]) => void;
}

function SplitPanel({
  file,
  accent,
  text,
  onTextChange,
  mode,
  onModeChange,
  onSplit,
}: SplitPanelProps) {
  const doc = usePdfPages(file);
  const inputId = useId();
  const hintId = useId();
  const count = doc.status === 'ready' ? doc.pages.count : 0;
  const parsed = useMemo(() => (count ? parseRanges(text, count) : null), [text, count]);
  const ranges = useMemo(() => (parsed?.ok ? parsed.ranges : []), [parsed]);
  const picked = useMemo(() => pagesIn(ranges), [ranges]);
  const selected = useMemo(() => new Set(picked), [picked]);
  const groups = useMemo(() => {
    if (mode !== 'separate' || ranges.length < 2) return undefined;
    const map = new Map<number, number>();
    ranges.forEach((r, i) => {
      for (let p = r.from; p <= r.to; p++) if (!map.has(p)) map.set(p, i + 1);
    });
    return map;
  }, [mode, ranges]);
  // Only complain once there is something typed; an empty box is just a start.
  const error = text.trim() && parsed && !parsed.ok ? parsed.error : null;
  const ready = ranges.length > 0;
  const files = mode === 'separate' ? ranges.length : 1;

  const quick = (pages: number[]) => onTextChange(formatPages(pages));
  const all = Array.from({ length: count }, (_, i) => i + 1);

  if (doc.status === 'error') {
    return (
      <p role="alert" className="rounded-panel border border-coral/30 bg-coral/10 p-5 text-fg">
        {file.name} could not be opened. It may be damaged or password protected.
      </p>
    );
  }

  return (
    <div className="rounded-panel border border-line bg-surface p-5 shadow-soft backdrop-blur-xl sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end">
        <div className="flex-1">
          <label htmlFor={inputId} className="font-display text-xl font-bold tracking-tight">
            Pages to keep
          </label>
          <input
            id={inputId}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder={count > 2 ? `e.g. 1-2, ${count}` : 'e.g. 1'}
            aria-invalid={error ? true : undefined}
            aria-describedby={hintId}
            disabled={doc.status !== 'ready'}
            className={`mt-2 h-14 w-full rounded-2xl border-2 bg-canvas/60 px-4 font-display text-2xl font-semibold tracking-tight transition-colors placeholder:text-muted/60 disabled:opacity-60 ${
              error ? 'border-coral' : 'border-line'
            }`}
          />
          <p
            id={hintId}
            aria-live="polite"
            className={`mt-2 min-h-6 text-sm ${error ? 'font-semibold text-coral' : 'text-muted'}`}
          >
            {doc.status !== 'ready'
              ? 'Opening the pages...'
              : (error ??
                (ready
                  ? `${pagesWord(picked.length)} of ${count} picked.`
                  : `Tap pages below or type them. This PDF has ${pagesWord(count)}.`))}
          </p>
        </div>
        <ModeSwitch accent={accent} mode={mode} onChange={onModeChange} />
      </div>

      {doc.status === 'ready' ? (
        <>
          <div className="mt-5 mb-4 flex flex-wrap gap-2 text-sm font-semibold">
            <QuickPick onClick={() => quick(all)}>All</QuickPick>
            <QuickPick onClick={() => quick(all.filter((p) => p % 2 === 1))}>Odd</QuickPick>
            <QuickPick onClick={() => quick(all.filter((p) => p % 2 === 0))}>Even</QuickPick>
            <QuickPick onClick={() => onTextChange('')} disabled={!text}>
              Clear
            </QuickPick>
          </div>
          <PagePicker
            pages={doc.pages}
            accent={accent}
            selected={selected}
            groups={groups}
            onChange={(next) => onTextChange(formatPages(next))}
          />
        </>
      ) : (
        <div
          className="mt-5 grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5"
          aria-hidden="true"
        >
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-line" />
          ))}
        </div>
      )}

      <div className="mt-8 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted">
          {!ready
            ? 'Pick at least one page.'
            : mode === 'separate' && files > 1
              ? `Each range becomes its own PDF, packed in one zip.`
              : `The picked pages go into one new PDF. ${file.name} stays as it is.`}
        </p>
        <Button
          variant="accent"
          accent={accent}
          size="lg"
          onClick={() => onSplit(ranges)}
          disabled={!ready}
          className="shrink-0"
          icon={<KnifeIcon />}
        >
          {!ready
            ? 'Split PDF'
            : mode === 'separate' && files > 1
              ? `Split into ${files} PDFs`
              : `Extract ${pagesWord(picked.length)}`}
        </Button>
      </div>
    </div>
  );
}

function QuickPick({
  children,
  onClick,
  disabled,
}: {
  children: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-line px-3.5 py-1.5 text-muted transition-colors hover:border-line-strong hover:text-fg disabled:opacity-40 disabled:hover:border-line disabled:hover:text-muted"
    >
      {children}
    </button>
  );
}

const MODES: { id: SplitMode; label: string }[] = [
  { id: 'extract', label: 'One PDF' },
  { id: 'separate', label: 'Separate PDFs' },
];

function ModeSwitch({
  accent,
  mode,
  onChange,
}: {
  accent: Accent;
  mode: SplitMode;
  onChange: (mode: SplitMode) => void;
}) {
  const still = useStillMotion();
  const name = useId();
  return (
    <fieldset className="lg:mb-8">
      <legend className="sr-only">What to make</legend>
      <div className="relative grid grid-cols-2 rounded-2xl border border-line bg-canvas/60 p-1 sm:inline-grid">
        {MODES.map((m) => {
          const on = m.id === mode;
          return (
            <label
              key={m.id}
              className={`relative cursor-pointer rounded-xl px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--pick)] sm:px-4 ${on ? 'text-fg' : 'text-muted hover:text-fg'}`}
              style={{ '--pick': `var(--${accent})` } as CSSProperties}
            >
              {on ? (
                <motion.span
                  layoutId={still ? undefined : `${name}-pill`}
                  className="absolute inset-0 rounded-xl border border-line-strong bg-surface shadow-soft"
                  transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                />
              ) : null}
              <input
                type="radio"
                name={name}
                value={m.id}
                checked={on}
                onChange={() => onChange(m.id)}
                className="sr-only"
              />
              <span className="relative flex items-center justify-center gap-2">
                <ModeIcon mode={m.id} />
                {m.label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function ModeIcon({ mode }: { mode: SplitMode }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className="hidden size-4 sm:block"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      {mode === 'extract' ? (
        <>
          <rect x="5" y="3" width="10" height="14" rx="2" />
          <path d="M8 7.5h4M8 10.5h4" strokeLinecap="round" />
        </>
      ) : (
        <>
          <rect x="2" y="4" width="7" height="12" rx="1.6" />
          <rect x="11" y="4" width="7" height="12" rx="1.6" />
        </>
      )}
    </svg>
  );
}

function KnifeIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="size-full"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 17 13.5 6.5c1.5-1.5 3.5-1.6 4-1-.6 2.6-3 6-6.5 7.5L9 11" />
      <path d="m3 17 3-3" opacity="0.6" />
    </svg>
  );
}
