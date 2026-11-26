import { AnimatePresence, motion } from 'framer-motion';
import { useId, useState, type CSSProperties } from 'react';
import type { ResizedImage, ResizeSettings } from '../../lib/image/resize';
import {
  CENTERED,
  cropBox,
  CUSTOM,
  enlargement,
  fitInside,
  getPreset,
  heightFor,
  MAX_SIDE,
  MAX_ZOOM,
  parseSide,
  PRESETS,
  ratioLabel,
  resizeOutputType,
  widthFor,
  type CropBox,
  type CropView,
  type SizePreset,
} from '../../lib/image/resize-names';
import type { ToolInfo } from '../../tools';
import { useStillMotion } from '../../useStillMotion';
import { useResizeJob } from '../../workers/useResizeJob';
import { ToolWorkbench } from '../drop/ToolWorkbench';
import { useFileQueue, type QueuedFile } from '../drop/useFileQueue';
import { formatBytes } from '../drop/validate';
import { DoneCard } from '../result/DoneCard';
import { ErrorCard } from '../result/ErrorCard';
import { useObjectUrl } from '../result/useObjectUrl';
import { ZipContents } from '../result/ZipContents';
import { Button } from '../ui';
import type { Accent } from '../ui/accent';
import { accentFill, accentText } from '../ui/accent';
import { type WaitStep } from '../wait/progress';
import { TailorScene } from '../wait/scenes/TailorScene';
import { useStory } from '../wait/useStory';
import { WaitStage } from '../wait/WaitStage';
import { Cropper } from './Cropper';
import { usePhotoSource, type PhotoSource } from './usePhotoSource';

const STEPS: readonly WaitStep[] = [
  { id: 'reading', label: 'Laying out your photos' },
  { id: 'working', label: 'Cutting along the pattern' },
  { id: 'packing', label: 'Sewing on the size tag' },
];

const RESIZE_QUALITY = 0.92;

const times = (w: number, h: number) => `${w} × ${h}`;
const photosWord = (n: number) => (n === 1 ? '1 photo' : `${n} photos`);

/** What the person has asked for, worked out against the photo's real size. */
interface Plan {
  width: number;
  height: number;
  /** Frame shape, or null when the whole photo is kept. */
  aspect: number | null;
  valid: boolean;
}

interface CustomSize {
  width: string;
  height: string;
  /** Keep the whole photo and its shape (no crop). */
  whole: boolean;
}

/** Resize and crop: pick a size, choose what stays, cut in a worker. */
export function ResizeTool({ tool }: { tool: ToolInfo }) {
  const queue = useFileQueue(tool.id);
  const [picked, setPicked] = useState(0);
  const index = Math.min(picked, Math.max(0, queue.items.length - 1));
  const item = queue.items[index] ?? null;
  const photo = usePhotoSource(item?.file ?? null);
  const { job: work, clock, start, reset } = useResizeJob(undefined, Boolean(item));
  const story = useStory(work, clock, STEPS);
  const job = story.job;
  const still = useStillMotion();
  const [last, setLast] = useState<CutInfo | null>(null);
  const many = queue.items.length > 1;

  const startOver = () => {
    reset();
    queue.clear();
    setPicked(0);
  };

  const swap = still
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 18, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -10, scale: 0.98 },
      };
  const transition = { duration: 0.22 };
  const name = many ? photosWord(queue.items.length) : (item?.file.name ?? 'your photo');

  return (
    <AnimatePresence mode="wait" initial={false}>
      {job.status === 'idle' ? (
        <motion.div key="files" {...swap} transition={transition}>
          <ToolWorkbench
            tool={tool}
            queue={queue}
            footer={
              item ? (
                <ResizePanel
                  items={queue.items}
                  index={index}
                  onPick={setPicked}
                  photo={photo}
                  accent={tool.accent}
                  onCut={(settings, info) => {
                    setLast(info);
                    void start(
                      queue.items.map((i) => i.file),
                      settings,
                    );
                  }}
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
              title={`${last?.cut === false ? 'Resizing' : 'Cutting'} ${name} to ${last?.label ?? 'size'}`}
              steps={STEPS}
              current={job.stage}
              progress={job.progress}
              accent={tool.accent}
              onSkip={story.skip}
              canSkip={story.canSkip}
              scene={
                <TailorScene
                  accent={tool.accent}
                  progress={story.progress}
                  thumb={photo.url ?? undefined}
                  aspect={last?.aspect}
                  label={last?.label}
                />
              }
            />
          ) : job.status === 'done' ? (
            <DoneCard
              accent={tool.accent}
              title={doneTitle(job.items, last)}
              fileName={job.name}
              blob={job.blob}
              details={doneDetails(job.items, job.skipped)}
              extra={
                job.items.length > 1 ? (
                  <ZipContents
                    blob={job.blob}
                    accent={tool.accent}
                    items={job.items.map((i) => ({ name: i.name, detail: formatBytes(i.after) }))}
                  />
                ) : (
                  <ResultPreview blob={job.blob} accent={tool.accent} />
                )
              }
              downloadLabel={job.items.length > 1 ? 'Download ZIP' : 'Download photo'}
              actions={[
                {
                  label: many ? 'Resize other photos' : 'Resize another photo',
                  onClick: startOver,
                },
                { label: 'Try another size', onClick: reset },
              ]}
            />
          ) : (
            <ErrorCard
              title={many ? 'Your photos were not resized' : 'Your photo was not resized'}
              message={job.message}
              fileName={job.fileName}
              reason={job.reason}
              onRetry={reset}
              onBack={startOver}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface CutInfo {
  label: string;
  aspect: number;
  cut: boolean;
}

function doneTitle(items: readonly ResizedImage[], last: CutInfo | null): string {
  const first = items[0];
  if (items.length === 1 && first) return `Your photo is ${times(first.width, first.height)}`;
  return last?.cut === false
    ? `${photosWord(items.length)} now fit inside ${last.label}`
    : `${photosWord(items.length)} are now ${last?.label ?? 'resized'}`;
}

function doneDetails(items: readonly ResizedImage[], skipped: readonly { name: string }[]) {
  const before = items.reduce((n, i) => n + i.before, 0);
  const after = items.reduce((n, i) => n + i.after, 0);
  const parts = [`${formatBytes(before)} to ${formatBytes(after)}.`];
  if (skipped.length) {
    parts.push(
      `Left out ${skipped.map((s) => s.name).join(', ')}: ${skipped.length === 1 ? 'it' : 'they'} could not be opened.`,
    );
  }
  parts.push('Camera and location details removed.');
  return parts.join(' ');
}

/** The finished photo, small, so people see what they are downloading. */
function ResultPreview({ blob, accent }: { blob: Blob; accent: Accent }) {
  const url = useObjectUrl(blob);
  if (!url) return null;
  return (
    <div className="grid place-items-center rounded-2xl bg-canvas/50 p-4">
      <img
        src={url}
        alt="Your resized photo"
        className="max-h-56 max-w-full rounded-md shadow-soft"
        style={{ outline: `2px solid var(--${accent})`, outlineOffset: 3 }}
        data-testid="resize-result"
      />
    </div>
  );
}

interface PanelProps {
  items: readonly QueuedFile[];
  index: number;
  onPick: (index: number) => void;
  /** The photo on show. */
  photo: PhotoSource;
  accent: Accent;
  onCut: (settings: ResizeSettings, info: CutInfo) => void;
}

const EMPTY_FILE = new File([], 'photo');

function buttonLabel(plan: Plan, label: string, count: number): string {
  if (!plan.valid) return 'Pick a size';
  if (count === 1) return `${plan.aspect ? 'Cut' : 'Resize'} to ${label}`;
  return plan.aspect
    ? `Cut ${photosWord(count)} to ${label}`
    : `Fit ${photosWord(count)} inside ${label}`;
}

function planFor(presetId: string, custom: CustomSize): Plan {
  const preset = getPreset(presetId);
  if (preset) {
    return {
      width: preset.width,
      height: preset.height,
      aspect: preset.width / preset.height,
      valid: true,
    };
  }
  const w = parseSide(custom.width);
  const h = parseSide(custom.height);
  if (!w || !h) return { width: w ?? 0, height: h ?? 0, aspect: null, valid: false };
  return { width: w, height: h, aspect: custom.whole ? null : w / h, valid: true };
}

function ResizePanel({ items, index, onPick, photo, accent, onCut }: PanelProps) {
  const [presetId, setPresetId] = useState<string>(PRESETS[0]?.id ?? CUSTOM);
  /** Framing per photo; photos not in here are centred. */
  const [views, setViews] = useState<Record<string, CropView>>({});
  const [custom, setCustom] = useState<CustomSize | null>(null);
  const current = items[index] ?? items[0];
  const file = current?.file ?? EMPTY_FILE;
  const many = items.length > 1;
  const view = (current && views[current.id]) ?? CENTERED;
  const setView = (next: CropView) => {
    if (current) setViews((all) => ({ ...all, [current.id]: next }));
  };
  const size = photo.size;
  // Custom starts at the photo's own size, once known.
  const customNow: CustomSize = custom ?? {
    width: size ? String(size.width) : '',
    height: size ? String(size.height) : '',
    whole: true,
  };
  const plan = planFor(presetId, customNow);
  const label = plan.valid ? times(plan.width, plan.height) : 'pick a size';
  const box = size && plan.aspect ? cropBox(size.width, size.height, plan.aspect, view) : null;
  // A whole photo in a batch fits inside the box, so its own size may be smaller.
  const out =
    size && plan.valid && !plan.aspect
      ? fitInside(size.width, size.height, plan.width, plan.height)
      : plan;
  const grow =
    size && plan.valid
      ? enlargement(
          size.width,
          size.height,
          box ?? { x: 0, y: 0, width: 1, height: 1 },
          out.width,
          out.height,
        )
      : 1;
  const type = resizeOutputType(file);
  const typeLabel = type === 'image/jpeg' ? 'JPG' : type === 'image/webp' ? 'WebP' : 'PNG';
  // In a batch a photo that cannot be shown is left out and named, not a blocker.
  const ready = many ? plan.valid : Boolean(size && photo.file && plan.valid && !photo.failed);
  const moved = items.filter((i) => !isCentred(views[i.id])).length;

  const pick = (id: string) => {
    setPresetId(id);
    setViews({});
  };

  const editCustom = (next: Partial<CustomSize>) => {
    const merged = { ...customNow, ...next };
    // One photo: the other side follows its shape. A batch fits each photo inside both numbers.
    if (size && merged.whole && !many) {
      // Keep the photo's shape: the other side follows.
      if (next.width !== undefined) {
        const w = parseSide(next.width);
        if (w) merged.height = String(heightFor(size.width, size.height, w));
      } else if (next.height !== undefined) {
        const h = parseSide(next.height);
        if (h) merged.width = String(widthFor(size.width, size.height, h));
      } else if (next.whole) {
        const w = parseSide(merged.width);
        if (w) merged.height = String(heightFor(size.width, size.height, w));
      }
    }
    setCustom(merged);
    setViews({});
  };

  const notes: string[] = [];
  if (grow > 1.05)
    notes.push(
      `${many ? `In ${file.name}, this` : 'This'} part of the photo is ${grow.toFixed(1)}× smaller than ${times(out.width, out.height)}, so it gets stretched and will look softer.`,
    );
  if (many && plan.valid && plan.aspect)
    notes.push(
      moved
        ? `Every photo is cut to the same size. You moved the frame on ${photosWord(moved)}; the rest are centred.`
        : 'Every photo is cut to the same size, centred. Pick a photo above to move its frame.',
    );
  if (items.some((i) => /\.gif$/i.test(i.file.name) || i.file.type === 'image/gif'))
    notes.push('GIFs are saved as PNG, and a moving GIF keeps only its first frame.');
  if (presetId === 'passport' || presetId === 'us-passport')
    notes.push(
      'Official rules vary: most ask for a plain light background, your face centred and no glasses. Check yours before printing.',
    );
  if (presetId === 'linkedin-banner')
    notes.push('Your profile photo covers the lower left of the banner, so keep that part plain.');

  const cut = () => {
    if (!ready) return;
    onCut(
      {
        width: plan.width,
        height: plan.height,
        cut: Boolean(plan.aspect),
        views: items.map((i) => views[i.id] ?? null),
        quality: RESIZE_QUALITY,
      },
      {
        label,
        aspect: plan.aspect ?? (size ? size.width / size.height : plan.width / plan.height),
        cut: Boolean(plan.aspect),
      },
    );
  };

  return (
    <div className="rounded-panel border border-line bg-surface p-4 shadow-soft backdrop-blur-xl sm:p-7">
      <h2 className="sr-only">Choose a size for {many ? photosWord(items.length) : file.name}</h2>
      <div className="grid min-w-0 gap-7">
        <div className="min-w-0">
          {many ? (
            <FrameStrip
              items={items}
              index={index}
              onPick={onPick}
              aspect={plan.valid ? plan.aspect : null}
              views={views}
              accent={accent}
            />
          ) : null}
          {photo.failed ? (
            <p className="rounded-2xl border border-coral/40 bg-coral/10 p-5 text-fg" role="alert">
              {file.name} could not be opened. It may be damaged, or use a format this browser
              cannot show.{' '}
              {many
                ? 'It will be left out; the other photos still get resized.'
                : 'Try another photo.'}
            </p>
          ) : (
            <Cropper
              url={photo.url}
              size={size}
              aspect={plan.valid ? plan.aspect : null}
              view={view}
              onView={setView}
              accent={accent}
              label={label}
              onLoad={photo.onLoad}
              onError={photo.onError}
            />
          )}
          {photo.decoding ? (
            <p className="mt-3 text-sm text-muted">Opening your HEIC photo on this device…</p>
          ) : null}
          <ZoomBar
            view={view}
            accent={accent}
            disabled={!box}
            onChange={setView}
            hint={
              box
                ? 'Drag the photo to choose what stays.'
                : plan.valid
                  ? many
                    ? `Each whole photo is kept and fits inside ${label}, nothing is cut off.`
                    : 'The whole photo is kept, nothing is cut off.'
                  : 'Enter a width and height.'
            }
          />
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <PresetPicker value={presetId} accent={accent} onChange={pick} />
          {presetId === CUSTOM ? (
            <CustomFields value={customNow} accent={accent} onChange={editCustom} many={many} />
          ) : null}
          {notes.length ? (
            <ul className="space-y-2 text-sm text-muted" data-testid="resize-notes">
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
        <p className="text-muted" data-testid="resize-summary">
          {many ? (
            <>
              {photosWord(items.length)} to{' '}
              <span className="font-semibold text-fg">
                {plan.valid && !plan.aspect ? `fit inside ${label}` : label}
              </span>
              , each saved in its own format. The originals stay as they are.
            </>
          ) : size ? (
            <>
              {times(size.width, size.height)} to{' '}
              <span className="font-semibold text-fg">{label}</span>, saved as {typeLabel}. The
              original stays as it is.
            </>
          ) : (
            `${file.name} is ${formatBytes(file.size)}.`
          )}
        </p>
        <Button
          variant="accent"
          accent={accent}
          size="lg"
          data-main-action
          onClick={cut}
          disabled={!ready}
          className="shrink-0"
          icon={<ShearsIcon />}
        >
          {buttonLabel(plan, label, items.length)}
        </Button>
      </div>
    </div>
  );
}

function ZoomBar({
  view,
  accent,
  disabled,
  onChange,
  hint,
}: {
  view: CropView;
  accent: Accent;
  disabled: boolean;
  onChange: (view: CropView) => void;
  hint: string;
}) {
  const id = useId();
  const fill = ((view.zoom - 1) / (MAX_ZOOM - 1)) * 100;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1">
      <label htmlFor={id} className="text-sm font-semibold text-muted">
        Zoom
      </label>
      <input
        id={id}
        type="range"
        min={1}
        max={MAX_ZOOM}
        step={0.05}
        value={view.zoom}
        disabled={disabled}
        onChange={(e) => onChange({ ...view, zoom: Number(e.target.value) })}
        aria-valuetext={`${Math.round(view.zoom * 100)}%`}
        className={`tone-range min-w-0 flex-1 ${disabled ? 'opacity-50' : ''}`}
        style={{ '--fill': `${fill}%`, '--tone': `var(--${accent})` } as CSSProperties}
      />
      <button
        type="button"
        onClick={() => onChange(CENTERED)}
        disabled={disabled || (view.zoom === 1 && view.x === 0.5 && view.y === 0.5)}
        className="rounded-lg text-sm font-semibold text-muted transition-colors hover:text-fg disabled:opacity-40 disabled:hover:text-muted"
      >
        Re-centre
      </button>
      <p className="w-full text-xs text-muted">{hint}</p>
    </div>
  );
}

/** A tiny outline of the size's real shape, so the list reads at a glance. */
function ShapeMark({ width, height, on }: { width: number; height: number; on: boolean }) {
  const a = width / height;
  const w = a >= 1 ? 26 : 26 * a;
  const h = a >= 1 ? 26 / a : 26;
  return (
    <svg viewBox="0 0 30 30" className="size-8 shrink-0" aria-hidden="true">
      <rect
        x={15 - w / 2}
        y={15 - h / 2}
        width={w}
        height={h}
        rx={2}
        fill={on ? 'currentColor' : 'none'}
        fillOpacity={on ? 0.2 : 0}
        stroke="currentColor"
        strokeWidth={1.6}
        strokeDasharray={on ? undefined : '3 2'}
      />
    </svg>
  );
}

function PresetPicker({
  value,
  accent,
  onChange,
}: {
  value: string;
  accent: Accent;
  onChange: (id: string) => void;
}) {
  const name = useId();
  const options: (SizePreset | { id: typeof CUSTOM; label: string; hint: string })[] = [
    ...PRESETS,
    { id: CUSTOM, label: 'Custom', hint: `Any size up to ${MAX_SIDE} px` },
  ];
  return (
    <fieldset className="min-w-0">
      <legend className="mb-3 font-display text-xl font-bold tracking-tight">Size</legend>
      <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:grid-cols-3">
        {options.map((o) => {
          const on = o.id === value;
          const preset = 'width' in o ? o : null;
          return (
            <label
              key={o.id}
              className={`flex min-w-0 cursor-pointer items-center gap-2.5 rounded-xl border-2 px-2.5 py-2 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--pick)] ${
                on
                  ? `border-current ${accentText[accent]} bg-canvas/40`
                  : 'border-line text-fg hover:border-line-strong'
              }`}
              style={{ '--pick': `var(--${accent})` } as CSSProperties}
              title={o.hint}
              data-on={on}
            >
              <input
                type="radio"
                name={name}
                value={o.id}
                checked={on}
                onChange={() => onChange(o.id)}
                className="sr-only"
              />
              {preset ? (
                <ShapeMark width={preset.width} height={preset.height} on={on} />
              ) : (
                <svg viewBox="0 0 30 30" className="size-8 shrink-0" aria-hidden="true">
                  <path
                    d="M6 11V6h5M19 6h5v5M24 19v5h-5M11 24H6v-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                  />
                </svg>
              )}
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-sm font-bold">{o.label}</span>{' '}
                <span className="truncate text-xs text-muted tabular-nums">
                  {preset ? `${times(preset.width, preset.height)}` : 'Your numbers'}
                  {preset ? (
                    <span className="sr-only">
                      , {ratioLabel(preset.width, preset.height)}, {o.hint}
                    </span>
                  ) : null}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function CustomFields({
  value,
  accent,
  onChange,
  many,
}: {
  value: CustomSize;
  accent: Accent;
  onChange: (next: Partial<CustomSize>) => void;
  /** Several photos: keeping them whole fits each inside both numbers. */
  many: boolean;
}) {
  const id = useId();
  const w = parseSide(value.width);
  const h = parseSide(value.height);
  const bad = (text: string, n: number | null) => text !== '' && n === null;
  const field = (side: 'width' | 'height', label: string, n: number | null) => (
    <div className="min-w-0 flex-1">
      <label htmlFor={`${id}-${side}`} className="text-sm font-semibold text-muted">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={`${id}-${side}`}
          inputMode="numeric"
          autoComplete="off"
          value={value[side]}
          onChange={(e) => onChange({ [side]: e.target.value.replace(/[^\d]/g, '').slice(0, 5) })}
          aria-invalid={bad(value[side], n)}
          aria-describedby={`${id}-help`}
          className={`w-full rounded-xl border-2 bg-canvas/60 py-2.5 pr-10 pl-3 font-display text-xl font-bold text-fg tabular-nums outline-none focus-visible:border-[var(--pick)] ${
            bad(value[side], n) ? 'border-coral' : 'border-line'
          }`}
          style={{ '--pick': `var(--${accent})` } as CSSProperties}
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted">
          px
        </span>
      </div>
    </div>
  );
  return (
    <div className="min-w-0" data-testid="custom-size">
      <div className="flex items-end gap-3">
        {field('width', 'Width', w)}
        <span aria-hidden="true" className="pb-3 font-display text-xl text-muted">
          ×
        </span>
        {field('height', 'Height', h)}
      </div>
      <label className="mt-3 flex cursor-pointer items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={value.whole}
          onChange={(e) => onChange({ whole: e.target.checked })}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={`relative h-6 w-10 shrink-0 rounded-full transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--pick)] ${
            value.whole ? accentFill[accent] : 'bg-line-strong'
          }`}
          style={{ '--pick': `var(--${accent})` } as CSSProperties}
        >
          <span
            className={`absolute top-1 size-4 rounded-full bg-white shadow transition-[left] ${value.whole ? 'left-5' : 'left-1'}`}
          />
        </span>
        <span>
          <span className="font-semibold text-fg">Keep the whole photo</span>
          <span className="block text-xs text-muted">
            {value.whole
              ? many
                ? 'Each photo fits inside these numbers and keeps its shape.'
                : 'Height follows width, so nothing is cut off.'
              : 'Cut to exactly these numbers. Drag the photo to choose what stays.'}
          </span>
        </span>
      </label>
      <p id={`${id}-help`} className="sr-only">
        Whole pixels from 1 to {MAX_SIDE}.
      </p>
      {bad(value.width, w) || bad(value.height, h) ? (
        <p className="mt-2 text-sm text-coral" role="alert">
          Use whole pixels from 1 to {MAX_SIDE}.
        </p>
      ) : null}
    </div>
  );
}

const isCentred = (v: CropView | undefined) => !v || (v.zoom === 1 && v.x === 0.5 && v.y === 0.5);

/**
 * Every photo in the batch, each drawn in the target shape with its own
 * framing, so the strip is a preview of the results.
 */
function FrameStrip({
  items,
  index,
  onPick,
  aspect,
  views,
  accent,
}: {
  items: readonly QueuedFile[];
  index: number;
  onPick: (index: number) => void;
  aspect: number | null;
  views: Record<string, CropView>;
  accent: Accent;
}) {
  return (
    <div
      className="-mx-1 mb-4 flex items-end gap-2.5 overflow-x-auto px-1 pt-2 pb-2"
      role="group"
      aria-label="Pick a photo to frame"
    >
      {items.map((item, i) => (
        <FrameThumb
          key={item.id}
          file={item.file}
          on={i === index}
          aspect={aspect}
          view={views[item.id]}
          accent={accent}
          onPick={() => onPick(i)}
        />
      ))}
    </div>
  );
}

const THUMB_H = 68;

function FrameThumb({
  file,
  on,
  aspect,
  view,
  accent,
  onPick,
}: {
  file: File;
  on: boolean;
  aspect: number | null;
  view: CropView | undefined;
  accent: Accent;
  onPick: () => void;
}) {
  const photo = usePhotoSource(file);
  const size = photo.size;
  // Whole photos show in their own shape; cut ones in the frame's.
  const shape = aspect ?? (size ? size.width / size.height : 1);
  const w = Math.round(Math.min(132, Math.max(44, THUMB_H * shape)));
  const h = Math.round(Math.min(THUMB_H, w / shape));
  const box: CropBox | null =
    size && aspect ? cropBox(size.width, size.height, aspect, view ?? CENTERED) : null;
  const moved = Boolean(aspect) && !isCentred(view);
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={on}
      aria-label={`${file.name}${moved ? ', frame moved' : ''}`}
      className={`relative shrink-0 rounded-[10px] border-2 p-0.5 transition-[border-color,transform] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 ${
        on
          ? `border-current ${accentText[accent]} -translate-y-1`
          : 'border-transparent hover:border-line-strong'
      }`}
      data-testid="resize-thumb"
      data-moved={moved}
    >
      <span
        className="relative block overflow-hidden rounded-md bg-canvas/70 shadow-soft motion-safe:transition-[width,height] motion-safe:duration-200"
        style={{ width: w, height: h }}
      >
        {photo.url ? (
          <img
            src={photo.url}
            alt=""
            draggable={false}
            onLoad={(e) => photo.onLoad(e.currentTarget)}
            onError={photo.onError}
            className={box ? 'absolute max-w-none' : 'h-full w-full object-cover'}
            style={
              box
                ? {
                    width: `${100 / box.width}%`,
                    height: `${100 / box.height}%`,
                    left: `${(-box.x / box.width) * 100}%`,
                    top: `${(-box.y / box.height) * 100}%`,
                  }
                : undefined
            }
          />
        ) : (
          <span className="grid h-full place-items-center text-xs font-bold text-muted">
            {photo.failed ? '!' : '…'}
          </span>
        )}
      </span>
      {moved ? (
        <span
          aria-hidden="true"
          className={`absolute -top-1 -right-1 size-3 rounded-full border-2 border-surface ${accentFill[accent]}`}
        />
      ) : null}
    </button>
  );
}

/** Open shears. */
function ShearsIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true">
      <circle cx="5" cy="5.5" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="5" cy="14.5" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M7 7l10 8M7 13l10-8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
