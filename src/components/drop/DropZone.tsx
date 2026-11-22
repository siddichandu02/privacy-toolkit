import { AnimatePresence, motion } from 'framer-motion';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from 'react';
import { useStillMotion } from '../../useStillMotion';
import { Pip } from '../pip/Pip';
import { accentFill, accentSoft, accentText, type Accent } from '../ui/accent';
import {
  acceptAttr,
  formatBytes,
  validateFiles,
  zoneNoun,
  type DropRules,
  type Rejection,
} from './validate';

/* Full class strings so Tailwind keeps them. */
const dashed: Record<Accent, string> = {
  violet: 'border-violet/45',
  coral: 'border-coral/45',
  mint: 'border-mint/45',
  sunshine: 'border-sunshine/45',
  sky: 'border-sky/45',
};
const active: Record<Accent, string> = {
  violet: 'border-violet bg-violet/10 shadow-glow-violet',
  coral: 'border-coral bg-coral/10 shadow-glow-coral',
  mint: 'border-mint bg-mint/10 shadow-glow-mint',
  sunshine: 'border-sunshine bg-sunshine/10 shadow-glow-sunshine',
  sky: 'border-sky bg-sky/10 shadow-glow-sky',
};
const fold: Record<Accent, string> = {
  violet: 'to-violet/35',
  coral: 'to-coral/35',
  mint: 'to-mint/35',
  sunshine: 'to-sunshine/35',
  sky: 'to-sky/35',
};

export interface DropZoneProps {
  rules: DropRules;
  accent: Accent;
  /** Called with the files that passed validation (never empty). */
  onFiles: (files: File[]) => void;
  /** How many files the list already holds, for the count limit. */
  existingCount?: number;
  /** Slim "add more" strip, used once some files are in. */
  compact?: boolean;
  /** Also take files pasted anywhere on the page. */
  acceptPaste?: boolean;
  /**
   * Files left out of the last add. Pass with onRejectedChange to keep the
   * message when the zone swaps between full and compact.
   */
  rejected?: Rejection[];
  onRejectedChange?: (rejected: Rejection[]) => void;
}

function hasFiles(e: DragEvent) {
  return Array.from(e.dataTransfer?.types ?? []).includes('Files');
}

/**
 * A sheet of paper to drop files on. Click, Enter or Space opens the file
 * picker; dropped or pasted files are checked against the rules, and anything
 * left out is explained right under the sheet.
 */
export function DropZone({
  rules,
  accent,
  onFiles,
  existingCount = 0,
  compact = false,
  acceptPaste = true,
  rejected: rejectedProp,
  onRejectedChange,
}: DropZoneProps) {
  const still = useStillMotion();
  const input = useRef<HTMLInputElement>(null);
  const depth = useRef(0);
  const [over, setOver] = useState(false);
  const [ownRejected, setOwnRejected] = useState<Rejection[]>([]);
  const rejected = rejectedProp ?? ownRejected;
  const setRejected = onRejectedChange ?? setOwnRejected;
  const hintId = useId();
  const errorId = useId();

  const take = (files: File[]) => {
    if (files.length === 0) return;
    const result = validateFiles(files, rules, existingCount);
    setRejected(result.rejected);
    if (result.accepted.length > 0) onFiles(result.accepted);
  };

  // Keep the latest take() for the paste listener without re-binding it.
  const takeRef = useRef(take);
  useEffect(() => {
    takeRef.current = take;
  });

  useEffect(() => {
    if (!acceptPaste) return;
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target;
      if (target instanceof Element && target.closest('input, textarea, [contenteditable="true"]'))
        return;
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length === 0) return;
      e.preventDefault();
      takeRef.current(files);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [acceptPaste]);

  const open = () => input.current?.click();

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
    }
  };

  const onDragEnter = (e: DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth.current += 1;
    setOver(true);
  };
  const onDragOver = (e: DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };
  // Child elements fire their own enter/leave pairs; count them so the
  // highlight does not flicker while the pointer crosses the text.
  const onDragLeave = () => {
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setOver(false);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    depth.current = 0;
    setOver(false);
    take(Array.from(e.dataTransfer.files));
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    take(Array.from(e.target.files ?? []));
    // Allow picking the same file again later.
    e.target.value = '';
  };

  const single = rules.maxFiles === 1;
  const noun = zoneNoun(rules);
  const limits = single
    ? rules.maxSize
      ? `Up to ${formatBytes(rules.maxSize)}`
      : ''
    : [
        rules.maxFiles ? `Up to ${rules.maxFiles} files` : null,
        rules.maxSize ? `${formatBytes(rules.maxSize)} each` : null,
      ]
        .filter(Boolean)
        .join(', ');

  const title = over
    ? single
      ? 'Let go to add it'
      : 'Let go to add them'
    : compact
      ? `Add more ${rules.kindLabel}`
      : `Drop ${noun} here`;

  return (
    <div className="relative">
      {/* Pip peeks over the top edge while files hover the sheet. */}
      {!compact ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-10 bottom-full h-20 w-28 overflow-hidden sm:right-16"
        >
          <AnimatePresence>
            {over ? (
              <motion.div
                key="pip"
                initial={still ? { opacity: 0 } : { y: '100%' }}
                animate={still ? { opacity: 1 } : { y: '6%' }}
                exit={still ? { opacity: 0 } : { y: '100%' }}
                transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                className="w-28"
              >
                <Pip accent={accent} className="w-28" />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      ) : null}

      <motion.div
        role="button"
        tabIndex={0}
        aria-label={compact ? `Add more ${rules.kindLabel}` : `Choose ${noun}`}
        aria-describedby={rejected.length > 0 ? `${hintId} ${errorId}` : hintId}
        data-dragging={over}
        onClick={open}
        onKeyDown={onKeyDown}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        animate={
          still
            ? undefined
            : over
              ? { scale: 1.015, rotate: -0.6, y: -4 }
              : { scale: 1, rotate: 0, y: 0 }
        }
        whileTap={still ? undefined : { scale: 0.985 }}
        transition={{ type: 'spring', stiffness: 380, damping: 24 }}
        className={`group relative cursor-pointer overflow-hidden rounded-panel border-2 border-dashed backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-200 focus-visible:rounded-panel ${
          over ? active[accent] : `bg-surface shadow-soft hover:bg-surface-strong ${dashed[accent]}`
        } ${compact ? 'px-5 py-4' : 'px-6 py-12 sm:py-16'}`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-0 right-0 rounded-bl-2xl bg-linear-to-bl from-canvas from-50% to-50% transition-[width,height] duration-300 ease-spring group-hover:size-14 motion-reduce:transition-none ${fold[accent]} ${compact ? 'size-7' : 'size-10'}`}
        />

        {compact ? (
          <div className="flex items-center gap-4">
            <span
              aria-hidden="true"
              className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${accentSoft[accent]}`}
            >
              <PlusIcon />
            </span>
            <div className="min-w-0">
              <p className="font-display text-lg font-bold tracking-tight">{title}</p>
              <p id={hintId} className="text-sm text-muted">
                Drop, paste or click. {limits}.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <PagesArt accent={accent} lifted={over} still={still} />
            <p className="mt-6 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              {over ? (
                title
              ) : (
                <>
                  {/* Phones cannot drag files in, so they get a tap prompt. */}
                  <span className="pointer-coarse:hidden">{title}</span>
                  <span className="hidden pointer-coarse:inline">Choose {noun}</span>
                </>
              )}
            </p>
            <p id={hintId} className="mt-3 max-w-md text-base leading-relaxed text-muted">
              {single ? 'Or paste it, or pick it' : 'Or paste them, or pick them'} from your device.{' '}
              {limits ? `${limits}. ` : null}
              {single ? 'It is' : 'They are'} opened right here in your browser and never sent to a
              server.
            </p>
            <span
              aria-hidden="true"
              className={`mt-7 inline-flex h-11 items-center gap-2 rounded-control px-5 font-semibold shadow-soft transition-transform duration-200 group-hover:-translate-y-0.5 motion-reduce:transition-none ${accentFill[accent]}`}
            >
              <PlusIcon />
              Choose files
            </span>
          </div>
        )}
      </motion.div>

      <input
        ref={input}
        type="file"
        multiple={rules.maxFiles !== 1}
        accept={acceptAttr(rules)}
        onChange={onChange}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        data-testid="file-input"
      />

      <RejectionNotice id={errorId} rejected={rejected} onDismiss={() => setRejected([])} />
    </div>
  );
}

/** Why some files were left out, with a way to clear the message. */
export function RejectionNotice({
  id,
  rejected,
  onDismiss,
}: {
  id?: string;
  rejected: readonly Rejection[];
  onDismiss: () => void;
}) {
  return (
    <div id={id} aria-live="polite">
      {rejected.length > 0 ? (
        <div className="mt-3 flex items-start gap-3 rounded-card border border-coral/30 bg-coral/10 px-4 py-3 text-sm">
          <ul className="min-w-0 flex-1 space-y-1">
            {rejected.map((r, i) => (
              <li key={`${r.name}-${i}`} className="break-words">
                {r.message}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={onDismiss}
            className={`shrink-0 rounded-lg px-1.5 font-semibold ${accentText.coral} hover:underline`}
          >
            Dismiss
          </button>
        </div>
      ) : null}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** Three loose sheets that fan out while files hover the zone. */
function PagesArt({ accent, lifted, still }: { accent: Accent; lifted: boolean; still: boolean }) {
  const spread = lifted && !still;
  const sheet =
    'absolute inset-0 rounded-xl border border-line-strong bg-canvas-raised shadow-soft';
  return (
    <div aria-hidden="true" className="relative h-24 w-20">
      <motion.div
        className={sheet}
        animate={{ rotate: spread ? -16 : -7, x: spread ? -14 : -4 }}
        transition={{ type: 'spring', stiffness: 300, damping: 18 }}
      />
      <motion.div
        className={sheet}
        animate={{ rotate: spread ? 14 : 6, x: spread ? 14 : 4 }}
        transition={{ type: 'spring', stiffness: 300, damping: 18 }}
      />
      <motion.div
        className={`${sheet} flex flex-col gap-1.5 p-3`}
        animate={{ y: spread ? -10 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 16 }}
      >
        <span className={`h-2 w-8 rounded-full ${accentFill[accent]}`} />
        <span className="h-1.5 w-full rounded-full bg-line-strong" />
        <span className="h-1.5 w-full rounded-full bg-line-strong" />
        <span className="h-1.5 w-2/3 rounded-full bg-line-strong" />
      </motion.div>
    </div>
  );
}
