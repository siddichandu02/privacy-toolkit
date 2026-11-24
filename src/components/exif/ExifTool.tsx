import { AnimatePresence, motion } from 'framer-motion';
import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  GROUP_ORDER,
  GROUP_TITLE,
  revealLine,
  type DetailGroup,
  type PhotoDetails,
} from '../../lib/image/exif-details';
import { prefetchExifReader, readPhotoDetails } from '../../lib/image/exif-read';
import { isHeic, formatLabel } from '../../lib/image/convert-names';
import { prefetchHeic } from '../../lib/image/heic';
import type { ToolInfo } from '../../tools';
import { useStillMotion } from '../../useStillMotion';
import { useExifJob } from '../../workers/useExifJob';
import { ToolWorkbench } from '../drop/ToolWorkbench';
import { useFileQueue, type QueuedFile } from '../drop/useFileQueue';
import { formatBytes } from '../drop/validate';
import { DoneCard } from '../result/DoneCard';
import { ErrorCard } from '../result/ErrorCard';
import { useObjectUrl } from '../result/useObjectUrl';
import { Button } from '../ui';
import type { Accent } from '../ui/accent';
import { accentText } from '../ui/accent';
import { type WaitStep } from '../wait/progress';
import { ShredderScene } from '../wait/scenes/ShredderScene';
import { useStory } from '../wait/useStory';
import { useThumbnails } from '../wait/useThumbnails';
import { WaitStage } from '../wait/WaitStage';
import { Globe } from './Globe';
import { batchLine, singleLine } from './lines';
import { usePhotoDetails } from './usePhotoDetails';

const STEPS: readonly WaitStep[] = [
  { id: 'reading', label: 'Finding the hidden tags' },
  { id: 'working', label: 'Shredding them' },
  { id: 'packing', label: 'Handing back clean photos' },
];

/** Each kind of detail keeps one colour everywhere: here, in the list and in the story. */
const GROUP_COLOR: Record<DetailGroup, string> = {
  location: 'var(--coral)',
  when: 'var(--sunshine)',
  owner: 'var(--violet)',
  camera: 'var(--sky)',
  settings: 'var(--muted)',
  software: 'var(--mint)',
};

const photosWord = (n: number) => `${n} ${n === 1 ? 'photo' : 'photos'}`;

/** Remove EXIF: show what each photo gives away, then strip it in a worker. */
export function ExifTool({ tool }: { tool: ToolInfo }) {
  const queue = useFileQueue(tool.id);
  const files = useMemo(() => queue.items.map((i) => i.file), [queue.items]);
  const { job: work, clock, start, reset } = useExifJob(undefined, files.length > 0);
  const story = useStory(work, clock, STEPS);
  const job = story.job;
  const [thumb] = useThumbnails(job.status === 'running' ? files : [], 1);
  const details = usePhotoDetails(files);
  const anyHeic = files.some(isHeic);
  const still = useStillMotion();

  // Fetch the reader (and the HEIC decoder if needed) once photos are in, so it all works offline.
  useEffect(() => {
    if (files.length) prefetchExifReader();
  }, [files.length]);
  useEffect(() => {
    if (anyHeic) prefetchHeic();
  }, [anyHeic]);

  const run = () => {
    if (files.length) void start(files);
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
                <ExifPanel
                  items={queue.items}
                  details={details}
                  accent={tool.accent}
                  onClean={run}
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
                  ? `Removing details from ${photosWord(files.length)}`
                  : `Removing details from ${files[0]?.name ?? 'your photo'}`
              }
              steps={STEPS}
              current={job.stage}
              progress={job.progress}
              accent={tool.accent}
              onSkip={story.skip}
              canSkip={story.canSkip}
              scene={<ShredderScene accent={tool.accent} progress={story.progress} thumb={thumb} />}
            />
          ) : job.status === 'done' ? (
            <DoneCard
              accent={tool.accent}
              title={job.items.length > 1 ? 'Your photos are clean' : 'Your photo is clean'}
              fileName={job.name}
              blob={job.blob}
              details={doneDetails(job.items, job.skipped)}
              extra={
                job.items.length === 1 && job.blob.type.startsWith('image/') ? (
                  <CleanCheck blob={job.blob} accent={tool.accent} />
                ) : null
              }
              downloadLabel={job.items.length > 1 ? 'Download ZIP' : 'Download photo'}
              actions={[{ label: 'Clean other photos', onClick: startOver }]}
            />
          ) : (
            <ErrorCard
              title={many ? 'Your photos were not cleaned' : 'Your photo was not cleaned'}
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

function doneDetails(
  items: readonly { method: 'lossless' | 'redrawn'; name: string }[],
  skipped: readonly { name: string }[],
) {
  const redrawn = items.filter((i) => i.method === 'redrawn').length;
  const parts = [
    `Location, date, camera and every other hidden detail removed from ${photosWord(items.length)}.`,
  ];
  if (redrawn === 0) parts.push('Same picture, every pixel kept.');
  else if (redrawn < items.length)
    parts.push(`${redrawn} saved again as a new file (HEIC as JPG, others as PNG).`);
  else parts.push(redrawn === 1 ? 'Saved again as a new file.' : 'Saved again as new files.');
  if (skipped.length) {
    parts.push(
      `Left out ${skipped.map((s) => s.name).join(', ')}: ${skipped.length === 1 ? 'it' : 'they'} could not be opened.`,
    );
  }
  return parts.join(' ');
}

/** Reads the cleaned photo again on this device, as proof nothing is left. */
function CleanCheck({ blob, accent }: { blob: Blob; accent: Accent }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    void blob
      .arrayBuffer()
      .then((bytes) => readPhotoDetails(bytes))
      .then((d) => {
        if (live) setLeft(Object.values(d.groups).reduce((n, rows) => n + (rows?.length ?? 0), 0));
      });
    return () => {
      live = false;
    };
  }, [blob]);
  if (left === null) return null;
  return (
    <p className="flex items-center gap-2 text-sm text-muted" data-testid="clean-check">
      <span
        aria-hidden="true"
        className={`grid size-5 shrink-0 place-items-center rounded-full bg-current ${accentText[accent]}`}
      >
        <svg viewBox="0 0 12 12" className="size-3 text-canvas">
          <path
            d="M2.5 6.2 5 8.5l4.5-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {left === 0
        ? 'Checked again on this device: no personal details left.'
        : `Checked again: ${left} details are still readable.`}
    </p>
  );
}

interface PanelProps {
  items: readonly QueuedFile[];
  details: Map<File, PhotoDetails>;
  accent: Accent;
  onClean: () => void;
}

function ExifPanel({ items, details, accent, onClean }: PanelProps) {
  const [picked, setPicked] = useState(0);
  const index = Math.min(picked, items.length - 1);
  const shown = items[index]?.file;
  const shownDetails = shown ? details.get(shown) : undefined;
  const files = items.map((i) => i.file);
  const readAll = files.every((f) => details.has(f));
  const withPlace = files.filter((f) => details.get(f)?.location).length;
  const total = files.reduce((n, f) => n + f.size, 0);
  const many = items.length > 1;
  const notes = panelNotes(files);

  return (
    <div className="rounded-panel border border-line bg-surface p-5 shadow-soft backdrop-blur-xl sm:p-7">
      <h2
        className="max-w-[34ch] font-display text-2xl font-bold tracking-tight text-balance sm:text-3xl"
        aria-live="polite"
        data-testid="exif-headline"
      >
        {!readAll
          ? many
            ? `Looking inside ${photosWord(items.length)}…`
            : 'Looking inside your photo…'
          : many
            ? batchLine(files.length, withPlace, files.filter((f) => hasAny(details.get(f))).length)
            : singleLine(shownDetails)}
      </h2>

      {many ? (
        <PhotoStrip
          items={items}
          details={details}
          index={index}
          accent={accent}
          onPick={setPicked}
        />
      ) : null}

      {shown ? (
        <div className="mt-6 grid min-w-0 gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-8">
          <PhotoCard file={shown} details={shownDetails} />
          <Findings details={shownDetails} />
        </div>
      ) : null}

      <div className="mt-8 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2 text-sm text-muted">
          <p className="text-base">
            {many
              ? `${photosWord(items.length)}, ${formatBytes(total)} in total. You get them back in one ZIP.`
              : `${shown?.name} is ${formatBytes(total)}. The original stays as it is.`}
          </p>
          {notes.map((n) => (
            <p key={n}>{n}</p>
          ))}
        </div>
        <Button
          variant="accent"
          accent={accent}
          size="lg"
          onClick={onClean}
          className="w-full shrink-0 sm:w-auto"
          icon={<ShredIcon />}
        >
          {many ? `Clean ${photosWord(items.length)}` : 'Remove details'}
        </Button>
      </div>
    </div>
  );
}

const hasAny = (d: PhotoDetails | undefined) => !!d && Object.keys(d.groups).length > 0;

function panelNotes(files: readonly File[]): string[] {
  const labels = new Set(files.map(formatLabel));
  const notes: string[] = [];
  const lossless = [...labels].some((l) => l === 'JPG' || l === 'PNG' || l === 'WebP');
  if (lossless)
    notes.push('JPG, PNG and WebP keep every pixel. Only the hidden details are cut out.');
  if (labels.has('HEIC')) notes.push('HEIC photos are opened on this device and saved as JPG.');
  if (labels.has('GIF')) notes.push('GIF is saved as PNG; only the first frame is kept.');
  return notes;
}

/** Thumbnails of every photo, with a coral pin on the ones that show a place. */
function PhotoStrip({
  items,
  details,
  index,
  accent,
  onPick,
}: {
  items: readonly QueuedFile[];
  details: Map<File, PhotoDetails>;
  index: number;
  accent: Accent;
  onPick: (i: number) => void;
}) {
  return (
    <div
      className="-mx-1 mt-5 flex gap-2 overflow-x-auto px-1 py-1"
      role="group"
      aria-label="Pick a photo to look inside"
    >
      {items.map((item, i) => {
        const d = details.get(item.file);
        const on = i === index;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onPick(i)}
            aria-pressed={on}
            aria-label={`${item.file.name}: ${d ? revealLine(d) : 'reading'}`}
            className={`relative size-16 shrink-0 overflow-hidden rounded-xl border-2 transition-[border-color,transform] focus-visible:outline-2 focus-visible:outline-offset-2 sm:size-[4.5rem] ${
              on
                ? `border-current ${accentText[accent]} -translate-y-0.5`
                : 'border-line hover:border-line-strong'
            }`}
            data-testid="exif-thumb"
          >
            <Thumb file={item.file} />
            {d?.location ? (
              <span
                aria-hidden="true"
                className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-coral text-[#1b1633] shadow-soft"
                data-testid="exif-thumb-pin"
              >
                <PinIcon className="size-3" />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function Thumb({ file, className = '' }: { file: File; className?: string }) {
  const heic = isHeic(file);
  const url = useObjectUrl(heic ? null : file);
  if (heic || !url) {
    return (
      <span
        className={`grid h-full w-full place-items-center bg-canvas/60 font-display text-xs font-bold text-muted ${className}`}
      >
        {formatLabel(file)}
      </span>
    );
  }
  return <img src={url} alt="" className={`h-full w-full object-cover ${className}`} />;
}

/** The photo itself, with a tag per kind of detail tied to its corner. */
function PhotoCard({ file, details }: { file: File; details: PhotoDetails | undefined }) {
  const groups = details ? GROUP_ORDER.filter((g) => details.groups[g]) : [];
  return (
    <figure className="min-w-0">
      <div className="relative">
        <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-canvas/60">
          <Thumb file={file} className="text-base" />
        </div>
        {groups.length ? (
          <ul
            className="absolute -bottom-3 left-3 flex flex-wrap gap-1.5"
            aria-hidden="true"
            data-testid="photo-tags"
          >
            {groups.map((g, i) => (
              <motion.li
                key={g}
                initial={{ y: -8, opacity: 0, rotate: 0 }}
                animate={{ y: 0, opacity: 1, rotate: i % 2 ? 4 : -4 }}
                transition={{ type: 'spring', stiffness: 420, damping: 18, delay: i * 0.06 }}
              >
                <TagChip group={g} />
              </motion.li>
            ))}
          </ul>
        ) : null}
      </div>
      <figcaption className="mt-5 flex min-w-0 items-baseline justify-between gap-3 text-sm">
        <span className="truncate font-medium">{file.name}</span>
        <span className="shrink-0 text-muted tabular-nums">{formatBytes(file.size)}</span>
      </figcaption>
    </figure>
  );
}

/** A little luggage tag in the group's colour, the same shape the story uses. */
function TagChip({ group }: { group: DetailGroup }) {
  return (
    <svg viewBox="0 0 20 28" className="h-7 w-5 drop-shadow" data-group={group}>
      <path
        d="M1 7 L5 3 H15 L19 7 V26 Q19 27 18 27 H2 Q1 27 1 26 Z"
        style={{ fill: GROUP_COLOR[group] }}
        stroke="#1b1633"
        strokeWidth={0.8}
      />
      <circle cx={10} cy={7} r={1.6} fill="#fbf9ff" stroke="#1b1633" strokeWidth={0.6} />
    </svg>
  );
}

/** What the photo gives away, most revealing first. */
function Findings({ details }: { details: PhotoDetails | undefined }) {
  if (!details) {
    return (
      <div className="space-y-3" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-2xl bg-canvas/50" />
        ))}
      </div>
    );
  }
  const groups = GROUP_ORDER.filter((g) => details.groups[g]);
  const extra = details.extra;
  if (!groups.length) {
    return (
      <div
        className="grid place-items-center rounded-2xl border border-dashed border-line-strong p-6 text-center text-muted"
        data-testid="findings-empty"
      >
        <p>
          {details.total
            ? `${details.total} technical ${details.total === 1 ? 'detail' : 'details'}, like the colour space. Nothing that points to you.`
            : 'No hidden details found.'}
        </p>
      </div>
    );
  }
  return (
    <div className="min-w-0">
      <ul className="divide-y divide-line" data-testid="findings">
        {groups.map((g) => (
          <li key={g} className="flex min-w-0 gap-3 py-3 first:pt-0" data-group={g}>
            <span className="mt-1 shrink-0">
              <TagChip group={g} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold">{GROUP_TITLE[g]}</h3>
              <dl className="mt-0.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 text-sm">
                {details.groups[g]?.map((row) => (
                  <div key={row.label} className="contents">
                    <dt className="text-muted">{row.label}</dt>
                    <dd className="font-medium break-words tabular-nums">
                      {row.value.split(', ').map((part, i) => (
                        <Fragment key={i}>
                          {i ? ', ' : ''}
                          <span className="whitespace-nowrap">{part}</span>
                        </Fragment>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
              {g === 'location' ? (
                <p className="mt-1 text-xs text-muted">
                  Precise to a few metres. Anyone you send this photo to can see it.
                </p>
              ) : null}
            </div>
            {g === 'location' && details.location ? (
              <Globe location={details.location} className="size-16 shrink-0 sm:size-24" />
            ) : null}
          </li>
        ))}
      </ul>
      {extra > 0 ? (
        <p className="mt-2 text-sm text-muted">
          Plus {extra} technical {extra === 1 ? 'detail' : 'details'}. All of it goes.
        </p>
      ) : null}
    </div>
  );
}

function PinIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" className={className} aria-hidden="true">
      <path d="M6 11.2S2 7.6 2 4.8a4 4 0 0 1 8 0c0 2.8-4 6.4-4 6.4Z" fill="currentColor" />
      <circle cx="6" cy="4.8" r="1.4" fill="#fbf9ff" />
    </svg>
  );
}

/** A tag going into a shredder slot. */
function ShredIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true">
      <path
        d="M3 10h14M6 3h8v4H6zM5 13v4M8 13v3M11 13v4M14 13v3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
