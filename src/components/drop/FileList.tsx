import { AnimatePresence, motion, Reorder, useDragControls } from 'framer-motion';
import { useEffect, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { useStillMotion } from '../../useStillMotion';
import { accentSoft, accentText, type Accent } from '../ui/accent';
import { isPdf, makePreview, type FilePreview } from './preview';
import type { QueuedFile } from './useFileQueue';
import { formatBytes } from './validate';

export interface FileListProps {
  items: readonly QueuedFile[];
  accent: Accent;
  onReorder: (items: QueuedFile[]) => void;
  onMove: (id: string, by: number) => void;
  onRemove: (id: string) => void;
  /** Show order numbers and reorder controls (off for tools where order does not matter). */
  ordered?: boolean;
}

/** Load a preview for a file and revoke its object URL when the row goes away. */
function usePreview(file: File): FilePreview | 'loading' | 'failed' {
  const [state, setState] = useState<FilePreview | 'loading' | 'failed'>('loading');
  useEffect(() => {
    let alive = true;
    let url: string | null = null;
    makePreview(file).then(
      (preview) => {
        url = preview.url;
        if (alive) setState(preview);
        else if (url) URL.revokeObjectURL(url);
      },
      () => alive && setState('failed'),
    );
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [file]);
  return state;
}

/**
 * The files a tool will work on, as a stack of paper slips. Drag a slip by its
 * grip, or focus the grip and use the arrow keys, to change the order.
 */
export function FileList({
  items,
  accent,
  onReorder,
  onMove,
  onRemove,
  ordered = true,
}: FileListProps) {
  const [announcement, setAnnouncement] = useState('');
  // The slip that was just moved with a key or button, so it can flash.
  const [bump, setBump] = useState<{ id: string; n: number } | null>(null);

  const move = (item: QueuedFile, index: number, by: number) => {
    const to = index + by;
    if (to < 0 || to >= items.length) return;
    onMove(item.id, by);
    setBump((b) => ({ id: item.id, n: (b?.n ?? 0) + 1 }));
    setAnnouncement(`${item.file.name} moved to position ${to + 1} of ${items.length}.`);
  };

  const remove = (item: QueuedFile) => {
    onRemove(item.id);
    setAnnouncement(`${item.file.name} removed.`);
  };

  return (
    <>
      <Reorder.Group
        as="ol"
        axis="y"
        values={items as QueuedFile[]}
        onReorder={onReorder}
        className="space-y-2.5"
        aria-label="Selected files"
      >
        <AnimatePresence initial={false}>
          {items.map((item, index) => (
            <FileRow
              key={item.id}
              item={item}
              index={index}
              count={items.length}
              accent={accent}
              ordered={ordered}
              bump={bump?.id === item.id ? bump.n : 0}
              onMove={(by) => move(item, index, by)}
              onRemove={() => remove(item)}
            />
          ))}
        </AnimatePresence>
      </Reorder.Group>
      <p className="sr-only" aria-live="polite" role="status">
        {announcement}
      </p>
    </>
  );
}

interface FileRowProps {
  item: QueuedFile;
  index: number;
  count: number;
  accent: Accent;
  ordered: boolean;
  /** Changes each time this slip is moved with a key or button (0 = never). */
  bump: number;
  onMove: (by: number) => void;
  onRemove: () => void;
}

function FileRow({ item, index, count, accent, ordered, bump, onMove, onRemove }: FileRowProps) {
  const still = useStillMotion();
  const controls = useDragControls();
  const preview = usePreview(item.file);
  const name = item.file.name;
  const pages = typeof preview === 'object' ? preview.pages : null;

  const onGripKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      onMove(e.key === 'ArrowUp' ? -1 : 1);
    }
  };

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      initial={still ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      // Removed slips crumple a little and drop away.
      exit={
        still
          ? { opacity: 0 }
          : { opacity: 0, x: 28, y: 6, scale: 0.82, rotate: 7, transition: { duration: 0.22 } }
      }
      whileDrag={still ? undefined : { scale: 1.03, rotate: -1, zIndex: 10 }}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      className="relative flex items-center gap-2 rounded-card border border-line bg-surface p-2 pr-2.5 shadow-soft backdrop-blur-xl sm:gap-3 sm:p-2.5 sm:pr-3"
      data-testid="file-row"
      style={{ '--slip': `var(--${accent})` } as CSSProperties}
    >
      {/* A light glint runs across a slip when it lands in the list. */}
      {still ? null : (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
        >
          <motion.span
            className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-linear-to-r from-transparent via-[color-mix(in_srgb,var(--slip)_22%,transparent)] to-transparent"
            initial={{ x: '0%' }}
            animate={{ x: '450%' }}
            transition={{ duration: 0.75, ease: 'easeOut', delay: 0.08 }}
          />
        </span>
      )}
      {/* Moved with a key or button: the rim flashes in the tool colour. */}
      {bump > 0 ? (
        <motion.span
          key={bump}
          aria-hidden="true"
          data-testid="slip-flash"
          className="pointer-events-none absolute -inset-px rounded-[inherit] border-2 border-[var(--slip)]"
          initial={{ opacity: 0.9, scale: still ? 1 : 1.015 }}
          animate={{ opacity: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      ) : null}
      {ordered ? (
        <button
          type="button"
          aria-label={`Reorder ${name}, position ${index + 1} of ${count}. Use the arrow keys.`}
          onPointerDown={(e) => controls.start(e)}
          onKeyDown={onGripKey}
          className="flex h-12 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-strong hover:text-fg active:cursor-grabbing"
        >
          <GripIcon />
        </button>
      ) : null}

      <Thumb preview={preview} pdf={isPdf(item.file)} accent={accent} />

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold" title={name}>
          {ordered ? (
            <motion.span
              key={index}
              initial={still ? false : { scale: 1.5, y: -2 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 520, damping: 14 }}
              className={`mr-1.5 inline-block origin-bottom font-display font-bold ${accentText[accent]}`}
            >
              {index + 1}.
            </motion.span>
          ) : null}
          {name}
        </p>
        <p className="mt-0.5 text-sm text-muted">
          {formatBytes(item.file.size)}
          {pages !== null ? `, ${pages} ${pages === 1 ? 'page' : 'pages'}` : null}
        </p>
      </div>

      {ordered ? (
        <div className="hidden shrink-0 sm:flex">
          <IconButton label={`Move ${name} up`} disabled={index === 0} onClick={() => onMove(-1)}>
            <path d="M5 12.5 10 7.5l5 5" />
          </IconButton>
          <IconButton
            label={`Move ${name} down`}
            disabled={index === count - 1}
            onClick={() => onMove(1)}
          >
            <path d="M5 7.5 10 12.5l5-5" />
          </IconButton>
        </div>
      ) : null}
      <IconButton label={`Remove ${name}`} onClick={onRemove} danger>
        <path d="M6 6l8 8M14 6l-8 8" />
      </IconButton>
    </Reorder.Item>
  );
}

function Thumb({
  preview,
  pdf,
  accent,
}: {
  preview: FilePreview | 'loading' | 'failed';
  pdf: boolean;
  accent: Accent;
}) {
  const [broken, setBroken] = useState(false);
  const url = typeof preview === 'object' ? preview.url : null;
  const box =
    'relative h-14 w-11 shrink-0 overflow-hidden rounded-md border border-line-strong bg-canvas-raised shadow-soft sm:h-16 sm:w-12';

  if (preview === 'loading') {
    return <span aria-hidden="true" className={`${box} animate-pulse`} />;
  }
  if (!url || broken) {
    return (
      <span
        aria-hidden="true"
        className={`${box} flex items-center justify-center text-[0.65rem] font-bold ${accentSoft[accent]}`}
      >
        {pdf ? 'PDF' : 'IMG'}
      </span>
    );
  }
  return (
    <span className={box}>
      <img
        src={url}
        alt=""
        className="size-full object-cover object-top"
        onError={() => setBroken(true)}
        draggable={false}
      />
    </span>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted transition-[color,background-color,scale] duration-150 hover:bg-surface-strong active:scale-90 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent motion-reduce:active:scale-100 ${danger ? 'hover:text-coral' : 'hover:text-fg'}`}
    >
      <svg
        viewBox="0 0 20 20"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    </button>
  );
}

function GripIcon() {
  return (
    <svg viewBox="0 0 12 20" className="h-5 w-3" fill="currentColor" aria-hidden="true">
      {[4, 10, 16].map((y) => (
        <g key={y}>
          <circle cx="3" cy={y} r="1.6" />
          <circle cx="9" cy={y} r="1.6" />
        </g>
      ))}
    </svg>
  );
}
