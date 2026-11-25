import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useId, useState, type CSSProperties } from 'react';
import {
  DEFAULT_CONVERT,
  formatLabel,
  formatMix,
  isHeic,
  targetLabel,
  type ConvertSettings,
  type ConvertTarget,
} from '../../lib/image/convert-names';
import { prefetchHeic } from '../../lib/image/heic';
import type { ToolInfo } from '../../tools';
import { useStillMotion } from '../../useStillMotion';
import { useConvertJob } from '../../workers/useConvertJob';
import { ToolWorkbench } from '../drop/ToolWorkbench';
import { useFileQueue, type QueuedFile } from '../drop/useFileQueue';
import { formatBytes } from '../drop/validate';
import { DoneCard } from '../result/DoneCard';
import { ErrorCard } from '../result/ErrorCard';
import { ZipContents } from '../result/ZipContents';
import { Button } from '../ui';
import type { Accent } from '../ui/accent';
import { accentFill, accentText } from '../ui/accent';
import { type WaitStep } from '../wait/progress';
import { WashScene } from '../wait/scenes/WashScene';
import { useStory } from '../wait/useStory';
import { useThumbnails } from '../wait/useThumbnails';
import { WaitStage } from '../wait/WaitStage';
import { shrunkNote } from '../../lib/image/canvas-limit';

const STEPS: readonly WaitStep[] = [
  { id: 'reading', label: 'Opening your photos' },
  { id: 'working', label: 'Giving them a good wash' },
  { id: 'packing', label: 'Hanging them out to dry' },
];

interface TargetInfo {
  id: ConvertTarget;
  blurb: string;
}

const TARGETS: readonly TargetInfo[] = [
  { id: 'jpeg', blurb: 'Opens anywhere. The usual pick for photos.' },
  { id: 'png', blurb: 'No quality loss and keeps see-through parts. Bigger files.' },
  { id: 'webp', blurb: 'Small and sharp. Opens in every current browser.' },
];

const photosWord = (n: number) => `${n} ${n === 1 ? 'photo' : 'photos'}`;

/** Convert image: pick JPG, PNG or WebP and convert in a worker. HEIC is decoded first. */
export function ConvertTool({ tool }: { tool: ToolInfo }) {
  const queue = useFileQueue(tool.id);
  const files = queue.items.map((i) => i.file);
  const { job: work, clock, start, reset } = useConvertJob(undefined, files.length > 0);
  const story = useStory(work, clock, STEPS);
  const job = story.job;
  const still = useStillMotion();
  const [thumb] = useThumbnails(job.status === 'running' ? files : [], 1);
  const [settings, setSettings] = useState<ConvertSettings>(DEFAULT_CONVERT);
  const anyHeic = files.some(isHeic);

  // Fetch the HEIC decoder as soon as a HEIC photo is added, so converting works offline too.
  useEffect(() => {
    if (anyHeic) prefetchHeic();
  }, [anyHeic]);

  const run = () => {
    if (files.length) void start(files, settings);
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
  const many = files.length > 1;
  const to = targetLabel(settings.to);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {job.status === 'idle' ? (
        <motion.div key="files" {...swap} transition={transition}>
          <ToolWorkbench
            tool={tool}
            queue={queue}
            footer={
              queue.items.length ? (
                <ConvertPanel
                  items={queue.items}
                  accent={tool.accent}
                  settings={settings}
                  onChange={setSettings}
                  onConvert={run}
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
                many
                  ? `Converting ${photosWord(files.length)} to ${to}`
                  : `Converting ${files[0]?.name ?? 'your photo'} to ${to}`
              }
              steps={STEPS}
              current={job.stage}
              progress={job.progress}
              accent={tool.accent}
              onSkip={story.skip}
              canSkip={story.canSkip}
              scene={
                <WashScene
                  accent={tool.accent}
                  progress={story.progress}
                  thumb={thumb}
                  label={to}
                />
              }
            />
          ) : job.status === 'done' ? (
            <DoneCard
              accent={tool.accent}
              title={
                job.items.length > 1
                  ? `Your photos are now ${targetLabel(targetOf(job.items[0]?.type, settings.to))}`
                  : `Your photo is now ${targetLabel(targetOf(job.items[0]?.type, settings.to))}`
              }
              fileName={job.name}
              blob={job.blob}
              details={doneDetails(job.items, job.skipped, job.fellBack, to)}
              extra={
                job.items.length > 1 ? (
                  <ZipContents
                    blob={job.blob}
                    accent={tool.accent}
                    items={job.items.map((i) => ({
                      name: i.name,
                      detail: `${formatBytes(i.before)} to ${formatBytes(i.after)}`,
                    }))}
                  />
                ) : (
                  <ConvertedList items={job.items} accent={tool.accent} />
                )
              }
              downloadLabel={job.items.length > 1 ? 'Download ZIP' : 'Download photo'}
              actions={[
                { label: 'Convert other photos', onClick: startOver },
                { label: 'Pick another format', onClick: reset },
              ]}
            />
          ) : (
            <ErrorCard
              title={many ? 'Your photos were not converted' : 'Your photo was not converted'}
              message={job.message}
              fileName={job.fileName}
              reason={job.reason}
              onRetry={run}
              onBack={reset}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** The format that was really written, which can differ when a browser cannot save WebP. */
function targetOf(type: string | undefined, asked: ConvertTarget): ConvertTarget {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/jpeg') return 'jpeg';
  return asked;
}

function doneDetails(
  items: readonly { name: string; shrunk?: boolean }[],
  skipped: readonly { name: string }[],
  fellBack: boolean,
  asked: string,
) {
  const parts = [`${photosWord(items.length)} converted.`];
  if (fellBack) parts.push(`This browser cannot save ${asked}, so you get PNG instead.`);
  const shrunk = shrunkNote(items.filter((i) => i.shrunk).map((i) => i.name));
  if (shrunk) parts.push(shrunk);
  if (skipped.length) {
    parts.push(
      `Left out ${skipped.map((s) => s.name).join(', ')}: ${skipped.length === 1 ? 'it' : 'they'} could not be opened.`,
    );
  }
  parts.push('Camera and location details removed.');
  return parts.join(' ');
}

/** Old name and size to new name and size, for a single photo. */
function ConvertedList({
  items,
  accent,
}: {
  items: readonly { name: string; from: string; before: number; after: number }[];
  accent: Accent;
}) {
  return (
    <ul className="mt-1 space-y-1.5 text-sm" data-testid="converted-list">
      {items.map((item, i) => (
        <li key={i} className="flex min-w-0 items-baseline justify-between gap-3">
          <span className="truncate font-medium text-fg">{item.name}</span>
          <span className="shrink-0 text-muted tabular-nums">
            {formatBytes(item.before)}
            {' to '}
            <span className={`font-semibold ${accentText[accent]}`}>{formatBytes(item.after)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

interface PanelProps {
  items: readonly QueuedFile[];
  accent: Accent;
  settings: ConvertSettings;
  onChange: (settings: ConvertSettings) => void;
  onConvert: () => void;
}

function ConvertPanel({ items, accent, settings, onChange, onConvert }: PanelProps) {
  const files = items.map((i) => i.file);
  const total = files.reduce((n, f) => n + f.size, 0);
  const lossless = settings.to === 'png';
  const notes = panelNotes(files, settings.to);
  const to = targetLabel(settings.to);

  return (
    <div className="rounded-panel border border-line bg-surface p-5 shadow-soft backdrop-blur-xl sm:p-7">
      <Relabel files={files} to={to} accent={accent} />

      <div className="mt-7 flex flex-col gap-7">
        <TargetPicker
          value={settings.to}
          accent={accent}
          onChange={(next) => onChange({ ...settings, to: next })}
        />
        <div className="grid min-w-0 gap-5 md:grid-cols-2 md:gap-10">
          <QualitySlider
            value={Math.round(settings.quality * 100)}
            accent={accent}
            disabled={lossless}
            onChange={(q) => onChange({ ...settings, quality: q / 100 })}
          />
          {notes.length ? (
            <ul className="space-y-2 text-sm text-muted" data-testid="convert-notes">
              {notes.map((note) => (
                <li key={note} className="flex gap-2">
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 size-1.5 shrink-0 rounded-full bg-current ${accentText[accent]}`}
                  />
                  {note}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted">
          {items.length > 1
            ? `${photosWord(items.length)}, ${formatBytes(total)} in total. You get them back in one ZIP.`
            : `${files[0]?.name} is ${formatBytes(total)}. The original stays as it is.`}
        </p>
        <Button
          variant="accent"
          accent={accent}
          size="lg"
          onClick={onConvert}
          className="shrink-0"
          icon={<SwapIcon />}
        >
          {items.length > 1 ? `Convert ${photosWord(items.length)} to ${to}` : `Convert to ${to}`}
        </Button>
      </div>
    </div>
  );
}

/** Plain heads-ups that depend on what is in the pile and the chosen format. */
function panelNotes(files: readonly File[], to: ConvertTarget): string[] {
  const labels = new Set(files.map(formatLabel));
  const notes: string[] = [];
  if (labels.has('HEIC'))
    notes.push('HEIC photos are opened on this device first, which takes a moment.');
  if (to === 'jpeg' && (labels.has('PNG') || labels.has('WebP') || labels.has('GIF')))
    notes.push('JPG has no see-through parts, so they turn white.');
  if (labels.has('GIF')) notes.push('Only the first frame of a moving GIF is kept.');
  if (to === 'png' && (labels.has('JPG') || labels.has('HEIC')))
    notes.push('PNG copies of photos are often several times bigger than the original.');
  return notes;
}

/**
 * The pile as format chips, an arrow, and a chip for the new format that
 * flips over whenever another format is picked.
 */
function Relabel({ files, to, accent }: { files: readonly File[]; to: string; accent: Accent }) {
  const still = useStillMotion();
  const groups = formatMix(files).split(', ');
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2" data-testid="relabel">
      <h2 className="sr-only">
        Convert {formatMix(files)} to {to}
      </h2>
      <div aria-hidden="true" className="flex flex-wrap items-center gap-2">
        {groups.map((g) => (
          <span
            key={g}
            className="rounded-xl border border-line bg-canvas/60 px-3 py-1.5 font-display text-lg font-bold tracking-tight text-muted"
          >
            {g}
          </span>
        ))}
        <svg viewBox="0 0 40 16" className={`h-4 w-10 ${accentText[accent]}`}>
          <path
            d="M2 8h32m-6-5 6 5-6 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={still ? undefined : '3 3'}
            className={still ? undefined : 'relabel-flow'}
          />
        </svg>
        <span className="relative inline-grid [perspective:400px]">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={to}
              className={`rounded-xl px-3.5 py-1.5 font-display text-lg font-extrabold tracking-tight shadow-soft ${accentFill[accent]}`}
              initial={still ? { opacity: 0 } : { rotateX: -90, opacity: 0 }}
              animate={{ rotateX: 0, opacity: 1 }}
              exit={still ? { opacity: 0 } : { rotateX: 90, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 24 }}
              data-testid="relabel-target"
            >
              {to}
            </motion.span>
          </AnimatePresence>
        </span>
      </div>
    </div>
  );
}

/** Three big cards, one per format, built on plain radio buttons. */
function TargetPicker({
  value,
  accent,
  onChange,
}: {
  value: ConvertTarget;
  accent: Accent;
  onChange: (value: ConvertTarget) => void;
}) {
  const name = useId();
  const still = useStillMotion();
  return (
    <fieldset className="min-w-0">
      <legend className="mb-3 font-display text-xl font-bold tracking-tight">Convert to</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        {TARGETS.map((t) => {
          const on = t.id === value;
          return (
            <label
              key={t.id}
              className={`group relative flex cursor-pointer flex-col gap-1.5 rounded-2xl border-2 p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--pick)] ${
                on
                  ? `border-current ${accentText[accent]} bg-canvas/40`
                  : 'border-line text-fg hover:border-line-strong'
              }`}
              style={{ '--pick': `var(--${accent})` } as CSSProperties}
              data-on={on}
            >
              <input
                type="radio"
                name={name}
                value={t.id}
                checked={on}
                onChange={() => onChange(t.id)}
                className="sr-only"
              />
              <span className="flex items-start justify-between gap-3">
                <motion.span
                  className="font-display text-3xl font-extrabold tracking-tight"
                  animate={on && !still ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {targetLabel(t.id)}
                </motion.span>
                <span
                  aria-hidden="true"
                  className={`mt-1.5 grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors ${
                    on ? `border-transparent ${accentFill[accent]}` : 'border-line-strong'
                  }`}
                >
                  {on ? (
                    <svg viewBox="0 0 12 12" className="size-3">
                      <path
                        d="M2.5 6.2 5 8.5l4.5-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </span>
              </span>
              <span className="text-sm text-muted">{t.blurb}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function QualitySlider({
  value,
  accent,
  disabled,
  onChange,
}: {
  value: number;
  accent: Accent;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  const min = 50;
  const max = 100;
  const fill = ((value - min) / (max - min)) * 100;
  const hint = disabled
    ? 'PNG is saved without any loss, so there is nothing to set.'
    : value >= 90
      ? 'Looks the same as the original.'
      : value >= 75
        ? 'Hard to tell apart, noticeably smaller.'
        : 'Smaller, a little softer up close.';
  return (
    <div className={disabled ? 'opacity-60' : undefined}>
      <div className="flex items-baseline justify-between">
        <label htmlFor="convert-quality" className="text-sm font-semibold text-muted">
          Quality
        </label>
        <span
          className={`font-display text-2xl font-bold tabular-nums ${disabled ? 'text-muted' : accentText[accent]}`}
        >
          {disabled ? 'Lossless' : `${value}%`}
        </span>
      </div>
      <input
        id="convert-quality"
        type="range"
        min={min}
        max={max}
        step={5}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={`${value}%, ${hint}`}
        aria-describedby="convert-quality-hint"
        className="tone-range w-full"
        style={{ '--fill': `${fill}%`, '--tone': `var(--${accent})` } as CSSProperties}
      />
      <p id="convert-quality-hint" className="mt-1 text-xs text-muted">
        {hint}
      </p>
    </div>
  );
}

/** Two arrows chasing each other. */
function SwapIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true">
      <path
        d="M4 7h11m0 0-3-3m3 3-3 3M16 13H5m0 0 3-3m-3 3 3 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
