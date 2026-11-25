import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState, type CSSProperties } from 'react';
import {
  DEFAULT_SETTINGS,
  ignoresQuality,
  outputType,
  sourceType,
  type ImageCompressSettings,
  type OutputFormat,
} from '../../lib/image/compress-names';
import { hasHeic, prefetchHeic } from '../../lib/image/heic';
import { savedPercent } from '../../lib/pdf/file-names';
import type { ToolInfo } from '../../tools';
import { useStillMotion } from '../../useStillMotion';
import { useImageCompressJob } from '../../workers/useImageCompressJob';
import { useImagePreview } from '../../workers/useImagePreview';
import { SizeCompare } from '../compress/SizeCompare';
import { ToolWorkbench } from '../drop/ToolWorkbench';
import { useDrawableFile } from '../drop/useDrawableFile';
import { useFileQueue, type QueuedFile } from '../drop/useFileQueue';
import { formatBytes } from '../drop/validate';
import { DoneCard } from '../result/DoneCard';
import { ErrorCard } from '../result/ErrorCard';
import { useObjectUrl } from '../result/useObjectUrl';
import { Button } from '../ui';
import type { Accent } from '../ui/accent';
import { accentText } from '../ui/accent';
import { CompareSlider } from '../ui/CompareSlider';
import { Segmented, type SegmentOption } from '../ui/Segmented';
import { type WaitStep } from '../wait/progress';
import { SuitcaseScene } from '../wait/scenes/SuitcaseScene';
import { useStory } from '../wait/useStory';
import { useThumbnails } from '../wait/useThumbnails';
import { WaitStage } from '../wait/WaitStage';
import { ZipContents } from '../result/ZipContents';

const STEPS: readonly WaitStep[] = [
  { id: 'reading', label: 'Opening your photos' },
  { id: 'working', label: 'Squeezing every pixel' },
  { id: 'packing', label: 'Packing them up' },
];

const FORMATS: readonly SegmentOption<OutputFormat>[] = [
  { id: 'same', label: 'Same type' },
  { id: 'jpeg', label: 'JPG' },
  { id: 'webp', label: 'WebP' },
];

type EdgeId = 'full' | '2560' | '1920' | '1280';
const EDGES: readonly SegmentOption<EdgeId>[] = [
  { id: 'full', label: 'Full size' },
  { id: '2560', label: '2560' },
  { id: '1920', label: '1920' },
  { id: '1280', label: '1280' },
];
const edgeOf = (id: EdgeId) => (id === 'full' ? null : Number(id));
const edgeId = (edge: number | null): EdgeId => (edge ? (String(edge) as EdgeId) : 'full');

const FORMAT_HINTS: Record<OutputFormat, string> = {
  same: 'JPG stays JPG, PNG stays PNG, WebP stays WebP.',
  jpeg: 'Works everywhere. See-through parts turn white.',
  webp: 'Usually the smallest. Opens in every current browser.',
};

/** Plain word for how the quality will look. */
function qualityWord(q: number) {
  if (q >= 0.85) return 'Almost untouched';
  if (q >= 0.65) return 'Sharp, much smaller';
  if (q >= 0.45) return 'Fine on screens';
  return 'Smallest, visibly softer';
}

/**
 * The new copies came out bigger, which can happen when the type changes:
 * HEIC packs a photo very tightly, and PNG to JPG can go either way.
 */
function biggerDetails(
  before: number,
  after: number,
  heic: boolean,
  skipped: readonly { name: string }[],
) {
  const parts = [
    `${formatBytes(before)} became ${formatBytes(after)}.`,
    heic
      ? 'HEIC packs photos very tightly, so a JPG copy comes out a little bigger, but it opens in every app.'
      : 'The new type holds this picture less tightly than the original did.',
    'Try a lower quality or a smaller size to shrink it.',
  ];
  if (skipped.length) {
    parts.push(
      `Left out ${skipped.map((s) => s.name).join(', ')}: ${skipped.length === 1 ? 'it' : 'they'} could not be opened here.`,
    );
  }
  return parts.join(' ');
}

const photosWord = (n: number) => `${n} ${n === 1 ? 'photo' : 'photos'}`;

/** Compress image: pick quality, type and size, compare live, shrink in a worker. */
export function CompressImageTool({ tool }: { tool: ToolInfo }) {
  const queue = useFileQueue(tool.id);
  const files = queue.items.map((i) => i.file);
  const { job: work, clock, start, reset } = useImageCompressJob(undefined, files.length > 0);
  const story = useStory(work, clock, STEPS);
  const job = story.job;
  const still = useStillMotion();
  const [thumb] = useThumbnails(job.status === 'running' ? files : [], 1);
  const [settings, setSettings] = useState<ImageCompressSettings>(DEFAULT_SETTINGS);
  const anyHeic = hasHeic(files);
  // Fetch the HEIC decoder as soon as a HEIC photo is added, so shrinking works offline too.
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

  return (
    <AnimatePresence mode="wait" initial={false}>
      {job.status === 'idle' ? (
        <motion.div key="files" {...swap} transition={transition}>
          <ToolWorkbench
            tool={tool}
            queue={queue}
            footer={
              queue.items.length ? (
                <CompressImagePanel
                  items={queue.items}
                  accent={tool.accent}
                  settings={settings}
                  onChange={setSettings}
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
              title={
                many
                  ? `Shrinking ${photosWord(files.length)}`
                  : `Shrinking ${files[0]?.name ?? 'your photo'}`
              }
              steps={STEPS}
              current={job.stage}
              progress={job.progress}
              accent={tool.accent}
              onSkip={story.skip}
              canSkip={story.canSkip}
              scene={<SuitcaseScene accent={tool.accent} progress={story.progress} thumb={thumb} />}
            />
          ) : job.status === 'done' ? (
            job.after < job.before ? (
              <DoneCard
                accent={tool.accent}
                title={job.items.length > 1 ? 'Your photos are smaller' : 'Your photo is smaller'}
                fileName={job.name}
                blob={job.blob}
                details={doneDetails(
                  job.items.length,
                  job.items.filter((i) => i.kept).length,
                  job.skipped,
                )}
                extra={
                  <div className="grid gap-5">
                    <SizeCompare before={job.before} after={job.after} accent={tool.accent} />
                    {job.items.length > 1 ? (
                      <ZipContents
                        blob={job.blob}
                        accent={tool.accent}
                        items={job.items.map((i) => ({
                          name: i.name,
                          detail: i.kept ? 'kept as it was' : formatBytes(i.after),
                        }))}
                      />
                    ) : null}
                  </div>
                }
                downloadLabel={job.items.length > 1 ? 'Download ZIP' : 'Download photo'}
                actions={[
                  { label: 'Compress other photos', onClick: startOver },
                  { label: 'Change the settings', onClick: reset },
                ]}
              />
            ) : !job.items.every((i) => i.kept) ? (
              <DoneCard
                accent={tool.accent}
                title={job.items.length > 1 ? 'Your photos are ready' : 'Your photo is ready'}
                fileName={job.name}
                blob={job.blob}
                details={biggerDetails(job.before, job.after, anyHeic, job.skipped)}
                extra={
                  job.items.length > 1 ? (
                    <ZipContents
                      blob={job.blob}
                      accent={tool.accent}
                      items={job.items.map((i) => ({
                        name: i.name,
                        detail: i.kept ? 'kept as it was' : formatBytes(i.after),
                      }))}
                    />
                  ) : undefined
                }
                downloadLabel={job.items.length > 1 ? 'Download ZIP' : 'Download photo'}
                actions={[
                  { label: 'Change the settings', onClick: reset },
                  { label: 'Compress other photos', onClick: startOver },
                ]}
              />
            ) : (
              <DoneCard
                accent={tool.accent}
                title={
                  job.items.length > 1
                    ? 'These photos are already lean'
                    : 'This photo is already lean'
                }
                fileName={job.name}
                blob={job.blob}
                details={`They could not get any smaller with these settings, so you get the originals, ${formatBytes(job.before)}. Try a lower quality or a smaller size.`}
                downloadLabel={job.items.length > 1 ? 'Download ZIP' : 'Download photo'}
                actions={[
                  { label: 'Change the settings', onClick: reset },
                  { label: 'Compress other photos', onClick: startOver },
                ]}
              />
            )
          ) : (
            <ErrorCard
              title={many ? 'Your photos were not compressed' : 'Your photo was not compressed'}
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

function doneDetails(count: number, kept: number, skipped: readonly { name: string }[]) {
  const parts = [`${photosWord(count)} compressed.`];
  if (kept)
    parts.push(
      `${kept === count ? 'Kept as it was' : `${kept} kept as they were`}, since a new copy was not smaller.`,
    );
  if (skipped.length) {
    parts.push(
      `Left out ${skipped.map((s) => s.name).join(', ')}: ${skipped.length === 1 ? 'it' : 'they'} could not be opened here.`,
    );
  }
  parts.push('Camera and location details removed.');
  return parts.join(' ');
}

interface PanelProps {
  items: readonly QueuedFile[];
  accent: Accent;
  settings: ImageCompressSettings;
  onChange: (settings: ImageCompressSettings) => void;
  onCompress: () => void;
}

function CompressImagePanel({ items, accent, settings, onChange, onCompress }: PanelProps) {
  const [shown, setShown] = useState(0);
  const at = Math.min(shown, items.length - 1);
  const item = items[at];
  const file = item?.file;
  const { preview, busy, failed } = useImagePreview(file, settings);
  // HEIC photos show their decoded copy; the browser cannot draw the original.
  const original = useObjectUrl(useDrawableFile(file ?? null));
  // Remember the last known shape so the frame does not jump while a new preview is made.
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const nextAspect = preview ? preview.width / preview.height : undefined;
  if (nextAspect && nextAspect !== aspect) setAspect(nextAspect);

  const outType = file ? outputType(sourceType(file), settings.format) : 'image/jpeg';
  const lossless = ignoresQuality(outType);
  const quality = Math.round(settings.quality * 100);
  const total = items.reduce((n, i) => n + i.file.size, 0);
  const saved = preview && file ? savedPercent(file.size, preview.bytes) : null;

  return (
    <div className="rounded-panel border border-line bg-surface p-5 shadow-soft backdrop-blur-xl sm:p-7">
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-10">
        <figure className="min-w-0">
          {failed ? (
            <div className="grid aspect-[4/3] place-items-center rounded-panel border-2 border-dashed border-line px-6 text-center text-muted">
              <p>
                <span className="font-semibold text-fg">{file?.name}</span> cannot be shown in this
                browser. It may be damaged, or saved in a way this browser cannot read.
              </p>
            </div>
          ) : (
            <CompareSlider
              before={original}
              after={preview?.url ?? null}
              beforeAlt={`${file?.name ?? 'Your photo'}, original`}
              accent={accent}
              aspect={aspect ? Math.min(2, Math.max(0.75, aspect)) : 4 / 3}
              fit="contain"
              testId="photo-compare"
              overlay={<BusyVeil show={busy} />}
            />
          )}
          <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
            <span
              className="flex items-baseline gap-2"
              aria-live="polite"
              data-testid="preview-size"
            >
              {preview && file ? (
                <>
                  <span className="text-muted tabular-nums">{formatBytes(file.size)}</span>
                  <span className="text-muted">to</span>
                  <span className="font-semibold text-fg tabular-nums">
                    {formatBytes(preview.bytes)}
                  </span>
                  <SavedBadge percent={saved ?? 0} accent={accent} />
                </>
              ) : (
                <span className="text-muted">{failed ? ' ' : 'Making a preview...'}</span>
              )}
            </span>
            {items.length > 1 ? (
              <span className="flex items-center gap-1 text-muted">
                <Step
                  label="Show the previous photo"
                  disabled={at === 0}
                  onClick={() => setShown(at - 1)}
                  back
                />
                <span className="min-w-24 text-center tabular-nums">
                  Photo {at + 1} of {items.length}
                </span>
                <Step
                  label="Show the next photo"
                  disabled={at >= items.length - 1}
                  onClick={() => setShown(at + 1)}
                />
              </span>
            ) : null}
          </figcaption>
        </figure>

        <div className="flex min-w-0 flex-col gap-6">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight">How small?</h2>
            <p className="mt-1 text-sm text-muted">
              Drag the line on the photo to compare. Everything is worked out on this device.
            </p>
          </div>

          <QualitySlider
            value={quality}
            accent={accent}
            disabled={lossless}
            onChange={(q) => onChange({ ...settings, quality: q / 100 })}
            hint={
              lossless
                ? 'PNG is saved without loss, so quality does not change it. Pick JPG or WebP to make it much smaller.'
                : qualityWord(settings.quality)
            }
          />
          <Segmented
            legend="Save as"
            options={FORMATS}
            value={settings.format}
            onChange={(format) => onChange({ ...settings, format })}
            accent={accent}
            hint={
              settings.format === 'same' && items.some((i) => sourceType(i.file) === 'image/heic')
                ? `${FORMAT_HINTS.same} HEIC becomes JPG, so every app can open it.`
                : FORMAT_HINTS[settings.format]
            }
          />
          <Segmented
            legend="Longest side (pixels)"
            options={EDGES}
            value={edgeId(settings.maxEdge)}
            onChange={(id) => onChange({ ...settings, maxEdge: edgeOf(id) })}
            accent={accent}
            hint={
              settings.maxEdge
                ? `Bigger photos are scaled down to ${settings.maxEdge} px. Smaller ones stay as they are.`
                : 'Keeps every pixel. Scaling down saves the most.'
            }
          />
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted">
          {items.length > 1
            ? `${photosWord(items.length)}, ${formatBytes(total)} in total. You get them back in one ZIP.`
            : `${file?.name} is ${formatBytes(total)}. It stays as it is.`}
        </p>
        <Button
          variant="accent"
          accent={accent}
          size="lg"
          onClick={onCompress}
          className="shrink-0"
          icon={<SqueezeIcon />}
        >
          {items.length > 1 ? `Compress ${photosWord(items.length)}` : 'Compress photo'}
        </Button>
      </div>
    </div>
  );
}

function QualitySlider({
  value,
  accent,
  disabled,
  onChange,
  hint,
}: {
  value: number;
  accent: Accent;
  disabled: boolean;
  onChange: (value: number) => void;
  hint: string;
}) {
  const min = 10;
  const max = 95;
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor="photo-quality" className="text-sm font-semibold text-muted">
          Quality
        </label>
        <span
          className={`font-display text-2xl font-bold tabular-nums ${disabled ? 'text-muted' : accentText[accent]}`}
        >
          {disabled ? 'Lossless' : `${value}%`}
        </span>
      </div>
      <input
        id="photo-quality"
        type="range"
        min={min}
        max={max}
        step={5}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={`${value}%, ${hint}`}
        aria-describedby="photo-quality-hint"
        className="tone-range w-full"
        style={{ '--fill': `${fill}%`, '--tone': `var(--${accent})` } as CSSProperties}
      />
      <div aria-hidden="true" className="-mt-1 flex justify-between text-xs text-muted">
        <span>Smaller file</span>
        <span>Sharper photo</span>
      </div>
      <p id="photo-quality-hint" className="mt-2 text-xs text-muted">
        {hint}
      </p>
    </div>
  );
}

/** Pops each time the saving changes. */
function SavedBadge({ percent, accent }: { percent: number; accent: Accent }) {
  const still = useStillMotion();
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={percent}
        className={`inline-block font-display text-base font-extrabold ${accentText[accent]}`}
        initial={still ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.85 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={still ? { opacity: 0 } : { opacity: 0, y: -8 }}
        transition={{ type: 'spring', stiffness: 420, damping: 26 }}
      >
        {percent > 0 ? `${percent}% smaller` : 'no smaller'}
      </motion.span>
    </AnimatePresence>
  );
}

/** A soft sheen over the photo while a new preview is made. */
function BusyVeil({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show ? (
        <motion.span
          aria-hidden="true"
          data-testid="preview-busy"
          className="photo-busy pointer-events-none absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        />
      ) : null}
    </AnimatePresence>
  );
}

function Step({
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

/** Two arrows pressing a photo flat. */
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
