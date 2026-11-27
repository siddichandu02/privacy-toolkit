import { AnimatePresence, motion } from 'framer-motion';
import { useId, useMemo, useState, type ReactNode } from 'react';
import { formatPages, pagesIn, parseRanges, type PageRange } from '../../lib/pdf/ranges';
import {
  equalParts,
  everyN,
  extendPart,
  formatRanges,
  partOf,
  planSplit,
  togglePart,
  toggleSelection,
  type SplitMode,
  type SplitPlan,
} from '../../lib/pdf/split-plan';
import { useStillMotion } from '../../useStillMotion';
import { PdfOpenProblem } from '../pages/PdfOpenProblem';
import { usePdfPages } from '../pages/usePdfPages';
import { Button } from '../ui';
import type { Accent } from '../ui/accent';
import { ModeCards } from './ModeCards';
import { OutputPreview } from './OutputPreview';
import { PagePicker, type PageMark } from './PagePicker';
import { partColor } from './partColors';

const pagesWord = (n: number) => (n === 1 ? '1 page' : `${n} pages`);

type PresetKind = 'single' | 'everyN' | 'equal' | 'custom';
interface Preset {
  kind: PresetKind;
  /** Pages in each part for "Every N pages". */
  every: number;
  /** Number of parts for "Into N equal parts". */
  parts: number;
}

/** Smallest and largest useful N, so a preset always makes 2 files or more. */
const presetLimits = (kind: 'everyN' | 'equal', count: number) =>
  ({ min: 2, max: kind === 'everyN' ? count - 1 : count }) as const;

function presetRanges(p: Preset, count: number): PageRange[] | null {
  if (p.kind === 'single') return everyN(count, 1);
  if (p.kind === 'everyN') return everyN(count, p.every);
  if (p.kind === 'equal') return equalParts(count, p.parts);
  return null;
}

export interface SplitPanelProps {
  file: File;
  accent: Accent;
  text: string;
  onTextChange: (text: string) => void;
  mode: SplitMode;
  onModeChange: (mode: SplitMode) => void;
  onSplit: (plan: SplitPlan) => void;
}

/** Pick a mode, then pages or ranges, and see the files before splitting. */
export function SplitPanel({
  file,
  accent,
  text,
  onTextChange,
  mode: wanted,
  onModeChange,
  onSplit,
}: SplitPanelProps) {
  const doc = usePdfPages(file);
  const inputId = useId();
  const hintId = useId();
  const still = useStillMotion();
  const count = doc.status === 'ready' ? doc.pages.count : 0;
  // A one-page PDF can only be extracted.
  const mode: SplitMode = count === 1 ? 'extract' : wanted;
  const [preset, setPreset] = useState<Preset>({ kind: 'custom', every: 2, parts: 2 });

  const parsed = useMemo(() => (count ? parseRanges(text, count) : null), [text, count]);
  const ranges = useMemo(() => (parsed?.ok ? parsed.ranges : []), [parsed]);
  const selected = useMemo(() => new Set(pagesIn(ranges)), [ranges]);
  const plan = useMemo(
    () => planSplit(file.name, mode, ranges, count),
    [file.name, mode, ranges, count],
  );
  const files = plan.files.length;
  // Only complain once there is something typed; an empty box is just a start.
  const error = mode !== 'every' && text.trim() && parsed && !parsed.ok ? parsed.error : null;
  const lonePart = mode === 'parts' && files === 1;
  const ready = mode === 'extract' ? files === 1 : files > 1;

  const typed = (next: string) => {
    setPreset((p) => ({ ...p, kind: 'custom' }));
    onTextChange(next);
  };
  const applyPreset = (wantedPreset: Preset) => {
    const clamp = (n: number, kind: 'everyN' | 'equal') => {
      const { min, max } = presetLimits(kind, count);
      return Math.min(max, Math.max(min, n));
    };
    const next = {
      ...wantedPreset,
      every: clamp(wantedPreset.every, 'everyN'),
      parts: clamp(wantedPreset.parts, 'equal'),
    };
    setPreset(next);
    const made = presetRanges(next, count);
    if (made) onTextChange(formatRanges(made));
  };

  const mark = (page: number): PageMark | undefined => {
    if (mode === 'every') return { color: partColor(page - 1, accent), tag: `PDF ${page}` };
    if (mode === 'parts') {
      const i = partOf(ranges, page);
      return i === -1 ? undefined : { color: partColor(i, accent), tag: `PDF ${i + 1}` };
    }
    return selected.has(page) ? { color: `var(--${accent})` } : undefined;
  };
  const pick = (page: number, from: number | null) => {
    if (mode === 'parts') {
      const next = from !== null ? extendPart(ranges, from, page) : togglePart(ranges, page);
      typed(formatRanges(next));
    } else {
      typed(formatPages(toggleSelection(selected, page, from)));
    }
  };

  if (doc.status === 'error') {
    return <PdfOpenProblem name={file.name} locked={doc.locked} accent={accent} />;
  }

  const all = Array.from({ length: count }, (_, i) => i + 1);
  const hint =
    doc.status !== 'ready'
      ? 'Opening the pages...'
      : (error ??
        (mode === 'parts'
          ? files === 0
            ? 'Type ranges like 1-3, 5-7 or tap pages below. Each range becomes a file.'
            : lonePart
              ? null
              : `${files} parts. Shift-click a page to grow the part you touched last.`
          : files
            ? `${pagesWord(selected.size)} of ${count} picked.`
            : `Tap pages below or type them. This PDF has ${pagesWord(count)}.`));
  const swap = still
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: -6 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
      };

  return (
    <div className="rounded-panel border border-line bg-surface p-5 shadow-soft backdrop-blur-xl sm:p-7">
      <ModeCards accent={accent} mode={mode} pageCount={count} onChange={onModeChange} />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={mode} {...swap} transition={{ duration: 0.18 }} className="mt-6">
          {mode === 'every' ? (
            <p className="text-muted">
              {count
                ? `Every page of ${file.name} becomes its own PDF. Nothing to pick.`
                : 'Opening the pages...'}
            </p>
          ) : (
            <>
              {mode === 'parts' && doc.status === 'ready' ? (
                <PresetRow accent={accent} preset={preset} count={count} onChange={applyPreset} />
              ) : null}
              <label htmlFor={inputId} className="font-display text-lg font-bold tracking-tight">
                {mode === 'parts' ? 'Ranges, one file each' : 'Pages to keep'}
              </label>
              <input
                id={inputId}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
                value={text}
                onChange={(e) => typed(e.target.value)}
                placeholder={
                  mode === 'parts'
                    ? count > 4
                      ? `e.g. 1-${Math.floor(count / 2)}, ${Math.floor(count / 2) + 1}-${count}`
                      : 'e.g. 1, 2'
                    : count > 2
                      ? `e.g. 1-2, ${count}`
                      : 'e.g. 1'
                }
                aria-invalid={error ? true : undefined}
                aria-describedby={hintId}
                disabled={doc.status !== 'ready'}
                className={`mt-2 h-14 w-full rounded-2xl border-2 bg-canvas/60 px-4 font-display text-2xl font-semibold tracking-tight transition-colors placeholder:text-muted/60 disabled:opacity-60 ${
                  error ? 'border-coral' : 'border-line'
                }`}
              />
              <div id={hintId} aria-live="polite" className="mt-2 min-h-6 text-sm">
                {lonePart && !error ? (
                  <LonePartHint onExtract={() => onModeChange('extract')} />
                ) : (
                  <p className={error ? 'font-semibold text-coral' : 'text-muted'}>{hint}</p>
                )}
              </div>
              {mode === 'extract' && doc.status === 'ready' ? (
                <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold">
                  <QuickPick onClick={() => typed(formatPages(all))}>All</QuickPick>
                  <QuickPick onClick={() => typed(formatPages(all.filter((p) => p % 2 === 1)))}>
                    Odd
                  </QuickPick>
                  <QuickPick onClick={() => typed(formatPages(all.filter((p) => p % 2 === 0)))}>
                    Even
                  </QuickPick>
                  <QuickPick onClick={() => typed('')} disabled={!text}>
                    Clear
                  </QuickPick>
                </div>
              ) : null}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {doc.status === 'ready' ? (
        <>
          <div className="mt-6">
            <OutputPreview
              files={plan.files}
              pages={doc.pages}
              accent={accent}
              zipName={plan.zipName}
              colored={mode !== 'extract'}
            />
          </div>
          <div className="mt-6">
            <PagePicker
              pages={doc.pages}
              accent={accent}
              mark={mark}
              onPick={mode === 'every' ? undefined : pick}
            />
          </div>
        </>
      ) : (
        <div
          className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5"
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
            ? mode === 'extract'
              ? 'Pick at least one page.'
              : mode === 'parts'
                ? 'Set at least two parts.'
                : 'Opening the pages...'
            : mode === 'extract'
              ? `The picked pages go into one new PDF. ${file.name} stays as it is.`
              : `${files} PDFs, packed in one zip. ${file.name} stays as it is.`}
        </p>
        <Button
          variant="accent"
          accent={accent}
          size="lg"
          data-main-action
          onClick={() => onSplit(plan)}
          disabled={!ready}
          className="shrink-0"
          icon={<KnifeIcon />}
        >
          {!ready
            ? 'Split PDF'
            : mode === 'extract'
              ? `Extract ${pagesWord(selected.size)}`
              : `Split into ${files} PDFs`}
        </Button>
      </div>
    </div>
  );
}

function LonePartHint({ onExtract }: { onExtract: () => void }) {
  return (
    <p
      className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted"
      data-testid="lone-part-hint"
    >
      <span>Add another range (e.g. 1-3, 5-7) to get separate files.</span>
      <button
        type="button"
        onClick={onExtract}
        className="tap font-semibold text-fg underline decoration-line-strong underline-offset-4 hover:decoration-current"
      >
        Or extract these pages
      </button>
    </p>
  );
}

const PRESETS: { kind: PresetKind; label: (p: Preset) => string }[] = [
  { kind: 'single', label: () => 'Every page' },
  { kind: 'everyN', label: (p) => `Every ${p.every} pages` },
  { kind: 'equal', label: (p) => `Into ${p.parts} equal parts` },
  { kind: 'custom', label: () => 'Custom ranges' },
];

function PresetRow({
  accent,
  preset,
  count,
  onChange,
}: {
  accent: Accent;
  preset: Preset;
  count: number;
  onChange: (p: Preset) => void;
}) {
  const still = useStillMotion();
  const layout = useId();
  const usable = (kind: PresetKind) => {
    if (kind !== 'everyN' && kind !== 'equal') return true;
    const { min, max } = presetLimits(kind, count);
    return max >= min;
  };
  const kind = preset.kind;
  return (
    <div className="mb-5">
      <div
        role="group"
        aria-label="Quick splits"
        className="flex flex-wrap gap-2 text-sm font-semibold"
      >
        {PRESETS.filter((p) => usable(p.kind)).map((p) => {
          const on = p.kind === kind;
          return (
            <button
              key={p.kind}
              type="button"
              aria-pressed={on}
              onClick={() => onChange({ ...preset, kind: p.kind })}
              className={`relative rounded-full border px-3.5 py-1.5 transition-colors pointer-coarse:py-3 ${
                on
                  ? 'border-transparent text-fg'
                  : 'border-line text-muted hover:border-line-strong hover:text-fg'
              }`}
            >
              {on ? (
                <motion.span
                  layoutId={still ? undefined : `${layout}-chip`}
                  className="absolute inset-0 rounded-full border-2"
                  style={{ borderColor: `var(--${accent})` }}
                  transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                />
              ) : null}
              <span className="relative">{p.label(preset)}</span>
            </button>
          );
        })}
      </div>
      {kind === 'everyN' || kind === 'equal' ? (
        <Stepper
          label={kind === 'everyN' ? 'Pages in each part' : 'Number of parts'}
          value={kind === 'everyN' ? preset.every : preset.parts}
          {...presetLimits(kind, count)}
          onChange={(n) =>
            onChange(kind === 'everyN' ? { ...preset, every: n } : { ...preset, parts: n })
          }
        />
      ) : null}
    </div>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  const id = useId();
  const set = (n: number) => onChange(Math.min(max, Math.max(min, Math.round(n) || min)));
  return (
    <div className="mt-3 flex items-center gap-3">
      <label htmlFor={id} className="text-sm text-muted">
        {label}
      </label>
      <div className="flex items-center rounded-full border border-line bg-canvas/60">
        <StepButton label="Fewer" onClick={() => set(value - 1)} disabled={value <= min}>
          <path d="M5 10h10" />
        </StepButton>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={(e) => set(Number(e.target.value))}
          className="w-12 [appearance:textfield] bg-transparent text-center font-display text-lg font-bold tabular-nums [&::-webkit-inner-spin-button]:appearance-none"
        />
        <StepButton label="More" onClick={() => set(value + 1)} disabled={value >= max}>
          <path d="M5 10h10M10 5v10" />
        </StepButton>
      </div>
    </div>
  );
}

function StepButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:text-fg disabled:opacity-35 pointer-coarse:size-11"
    >
      <svg
        viewBox="0 0 20 20"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        {children}
      </svg>
    </button>
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
      className="rounded-full border border-line px-3.5 py-1.5 text-muted transition-colors hover:border-line-strong hover:text-fg disabled:opacity-40 disabled:hover:border-line disabled:hover:text-muted pointer-coarse:py-3"
    >
      {children}
    </button>
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
