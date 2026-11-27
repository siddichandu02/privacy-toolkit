import {
  animate,
  AnimatePresence,
  motion,
  Reorder,
  useDragControls,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
  type PanInfo,
} from 'framer-motion';
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { useStillMotion } from '../../useStillMotion';
import { accentSoft, accentText, type Accent } from '../ui/accent';
import { isPdf, makePreview, type FilePreview } from './preview';
import type { QueuedFile } from './useFileQueue';
import { formatBytes } from './validate';
import { swipeRemoves, SWIPE_ARM } from './swipe';

export interface FileListProps {
  items: readonly QueuedFile[];
  accent: Accent;
  onReorder: (items: QueuedFile[]) => void;
  onMove: (id: string, by: number) => void;
  onRemove: (id: string) => void;
  /** Show order numbers and reorder controls (off for tools where order does not matter). */
  ordered?: boolean;
  /** Plain name for the files, used on the fold ("images", "PDFs"). */
  noun?: string;
}

/** Lists longer than this fold up, so the tool's settings stay in reach on a phone. */
export const FOLD_AFTER = 8;
/** Slips still shown while the list is folded. */
export const FOLD_PEEK = 5;

/**
 * What a screen reader hears when files join the list, e.g. "a.pdf added. 3 PDFs
 * in the list." Several at once are counted rather than read out one by one.
 */
export function addedMessage(names: readonly string[], total: number, noun = 'files') {
  if (names.length === 0) return '';
  const what = names.length === 1 ? `${names[0]} added.` : `${names.length} ${noun} added.`;
  const one = noun.replace(/s$/, '');
  return `${what} ${total} ${total === 1 ? one : noun} in the list.`;
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
  noun = 'files',
}: FileListProps) {
  const [announcement, setAnnouncement] = useState('');
  const [open, setOpen] = useState(false);
  const folds = items.length > FOLD_AFTER;
  const folded = folds && !open;
  const shown = folded ? items.slice(0, FOLD_PEEK) : items;
  const hidden = items.length - shown.length;
  // The slip that was just moved with a key or button, so it can flash.
  const [bump, setBump] = useState<{ id: string; n: number } | null>(null);

  // Say when files arrive. Runs after paint, so the live region is already on
  // the page (empty) when the words land and screen readers pick them up.
  const seen = useRef<Set<string>>(new Set());
  useEffect(() => {
    const added = items.filter((i) => !seen.current.has(i.id));
    seen.current = new Set(items.map((i) => i.id));
    if (added.length > 0)
      setAnnouncement(
        addedMessage(
          added.map((i) => i.file.name),
          items.length,
          noun,
        ),
      );
  }, [items, noun]);

  const move = (item: QueuedFile, index: number, by: number) => {
    const to = index + by;
    if (to < 0 || to >= items.length) return;
    // Moving a slip past the fold opens the list, so it never vanishes from view.
    if (folded && to >= FOLD_PEEK) setOpen(true);
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
        values={shown as QueuedFile[]}
        // While folded only the top slips can be dragged; the rest keep their order.
        onReorder={(next) => onReorder([...next, ...items.slice(next.length)])}
        className="space-y-2.5"
        aria-label="Selected files"
      >
        <AnimatePresence initial={false}>
          {shown.map((item, index) => (
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
      {folds ? (
        <FoldToggle
          open={open}
          hidden={hidden}
          noun={noun}
          accent={accent}
          onToggle={() => setOpen((o) => !o)}
        />
      ) : null}
      <p className="sr-only" aria-live="polite" role="status">
        {announcement}
      </p>
    </>
  );
}

/**
 * The paper stack under a folded list: the slips that are not shown peek out
 * as fanned sheet edges behind a slip that says how many there are. Open, it
 * becomes a slim "Show fewer" strip.
 */
function FoldToggle({
  open,
  hidden,
  noun,
  accent,
  onToggle,
}: {
  open: boolean;
  hidden: number;
  noun: string;
  accent: Accent;
  onToggle: () => void;
}) {
  const still = useStillMotion();
  // One sheet edge per few hidden slips, three at most, so the stack looks as thick as it is.
  const sheets = Math.min(3, Math.ceil(hidden / 4));
  return (
    <div
      className={`relative isolate ${open ? 'mt-3' : 'mt-2.5'}`}
      style={{ paddingBottom: open ? 0 : sheets * 5 }}
    >
      {open
        ? null
        : Array.from({ length: sheets }, (_, i) => (
            <motion.span
              key={i}
              aria-hidden="true"
              data-testid="fold-sheet"
              className="absolute inset-x-0 top-0 rounded-card border border-line bg-surface shadow-soft"
              initial={false}
              animate={{
                y: (i + 1) * 5,
                rotate: still ? 0 : [0.8, -1.1, 1.4][i],
                scaleX: 1 - (i + 1) * 0.025,
              }}
              style={{ zIndex: -1 - i, height: `calc(100% - ${sheets * 5}px)` }}
            />
          ))}
      <motion.button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        data-testid="fold-toggle"
        whileHover={still ? undefined : { y: -2 }}
        whileTap={still ? undefined : { scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 520, damping: 26 }}
        className={`group relative flex w-full cursor-pointer items-center gap-3 rounded-card border bg-surface text-left shadow-soft backdrop-blur-xl ${
          open ? 'border-line px-3 py-2' : 'border-line-strong p-2.5 pr-3'
        }`}
      >
        {open ? null : (
          <span
            aria-hidden="true"
            className={`flex h-12 min-w-11 shrink-0 items-center justify-center rounded-md px-1.5 font-display text-lg font-bold ${accentSoft[accent]}`}
          >
            +{hidden}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">
            {open ? 'Show fewer' : `${hidden} more ${noun}`}
          </span>
          {open ? null : (
            <span className="mt-0.5 block text-sm text-muted">
              Folded to keep the settings close
            </span>
          )}
        </span>
        <span
          className={`flex shrink-0 items-center gap-1 text-sm font-semibold ${accentText[accent]}`}
        >
          {open ? null : 'Show all'}
          <svg
            viewBox="0 0 20 20"
            className={`size-5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 7.5 10 12.5l5-5" />
          </svg>
        </span>
      </motion.button>
    </div>
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

  // Swipe a slip left with a finger to remove it (the Undo slip can bring it back).
  const x = useMotionValue(0);
  const slip = useRef<HTMLDivElement>(null);
  const swipe = useDragControls();
  const [armed, setArmed] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const underOpacity = useTransform(x, [-SWIPE_ARM, -12, 0], [1, 0.6, 0]);
  // The glass slip is see-through, so only uncover the strip it has slid away from.
  const underClip = useTransform(
    x,
    (v) => `inset(0 0 0 calc(100% - ${Math.max(0, -v) + 2}px) round var(--radius-card))`,
  );
  useMotionValueEvent(x, 'change', (v) => setArmed(v <= -SWIPE_ARM));

  const onSlipPointerDown = (e: PointerEvent) => {
    if (still || leaving || e.pointerType !== 'touch') return;
    if ((e.target as Element).closest('button')) return;
    swipe.start(e);
  };

  const onSwipeEnd = (_: unknown, info: PanInfo) => {
    const width = slip.current?.offsetWidth ?? 320;
    if (!swipeRemoves(info.offset.x, info.velocity.x, width)) return;
    setLeaving(true);
    void animate(x, -width - 24, { type: 'spring', stiffness: 380, damping: 40 }).then(onRemove);
  };

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      initial={still ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      // Removed slips crumple a little and drop away; swiped ones just fade, already off to the side.
      exit={
        still || leaving
          ? { opacity: 0, transition: { duration: 0.18 } }
          : { opacity: 0, x: 28, y: 6, scale: 0.82, rotate: 7, transition: { duration: 0.22 } }
      }
      whileDrag={still ? undefined : { scale: 1.03, rotate: -1, zIndex: 10 }}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      className="relative"
      data-testid="file-row"
      style={{ '--slip': `var(--${accent})` } as CSSProperties}
    >
      {still ? null : (
        <motion.span
          aria-hidden="true"
          data-testid="swipe-under"
          data-armed={armed}
          className={`absolute inset-0 flex items-center justify-end rounded-card border pr-5 font-semibold transition-colors duration-150 ${
            armed
              ? 'border-coral bg-coral text-on-accent'
              : 'border-coral/40 bg-coral/15 text-coral'
          }`}
          style={{ opacity: underOpacity, clipPath: underClip }}
        >
          <motion.svg
            viewBox="0 0 20 20"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            animate={{ scale: armed ? 1.25 : 1, rotate: armed ? -12 : 0 }}
            transition={{ type: 'spring', stiffness: 600, damping: 15 }}
          >
            <path d="M4 6h12M8 6V4.5h4V6M6 6l.8 10h6.4L14 6" />
          </motion.svg>
          {/* The word only joins the bin once letting go would remove the
              file, so a short drag never shows it cut off. */}
          <motion.span
            className="overflow-hidden whitespace-nowrap"
            initial={false}
            animate={{
              width: armed ? 'auto' : 0,
              opacity: armed ? 1 : 0,
              marginLeft: armed ? 8 : 0,
            }}
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          >
            Remove
          </motion.span>
        </motion.span>
      )}
      <motion.div
        ref={slip}
        drag={still ? false : 'x'}
        dragControls={swipe}
        dragListener={false}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.9, right: 0.04 }}
        dragMomentum={false}
        onDragEnd={onSwipeEnd}
        onPointerDown={onSlipPointerDown}
        className="relative flex items-center gap-2 rounded-card border border-line bg-surface p-2 pr-2.5 shadow-soft backdrop-blur-xl sm:gap-3 sm:p-2.5 sm:pr-3"
        style={{ x, touchAction: 'pan-y' }}
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
            className="tap flex h-12 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-strong hover:text-fg active:cursor-grabbing"
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
      </motion.div>
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
      className={`flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted transition-[color,background-color,scale] duration-150 hover:bg-surface-strong active:scale-90 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent motion-reduce:active:scale-100 pointer-coarse:size-11 ${danger ? 'hover:text-coral' : 'hover:text-fg'}`}
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
