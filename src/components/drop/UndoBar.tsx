import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useStillMotion } from '../../useStillMotion';
import { accentFill, accentText, type Accent } from '../ui/accent';
import type { RemovedFiles } from './useFileQueue';

/** How long the slip stays up, in ms. Paused while hovered or focused. */
export const UNDO_MS = 7000;

function label(removed: RemovedFiles) {
  const { entries } = removed;
  if (entries.length === 1) return `Removed ${entries[0]?.item.file.name ?? 'file'}`;
  return `Removed ${entries.length} files`;
}

/**
 * A paper slip pinned to the bottom of the screen after a file is removed,
 * with an Undo button and a fuse that burns down. Ctrl+Z (or Cmd+Z) works too.
 */
export function UndoBar({
  removed,
  accent,
  onUndo,
  onDone,
}: {
  removed: RemovedFiles | null;
  accent: Accent;
  onUndo: () => void;
  onDone: () => void;
}) {
  const still = useStillMotion();
  const [held, setHeld] = useState(false);
  const left = useRef(UNDO_MS);
  const stamp = removed?.stamp;

  // A fresh remove gets a full fuse.
  useEffect(() => {
    left.current = UNDO_MS;
  }, [stamp]);

  useEffect(() => {
    if (stamp === undefined || held) return;
    const started = performance.now();
    const timer = window.setTimeout(onDone, left.current);
    return () => {
      window.clearTimeout(timer);
      left.current = Math.max(0, left.current - (performance.now() - started));
    };
  }, [stamp, held, onDone]);

  useEffect(() => {
    if (stamp === undefined) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'z' || !(e.ctrlKey || e.metaKey) || e.shiftKey) return;
      const t = e.target;
      if (t instanceof Element && t.closest('input, textarea, [contenteditable="true"]')) return;
      e.preventDefault();
      onUndo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stamp, onUndo]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 sm:bottom-6"
      aria-live="polite"
    >
      <AnimatePresence>
        {removed ? (
          <motion.div
            key="undo"
            role="status"
            data-testid="undo-bar"
            initial={still ? { opacity: 0 } : { opacity: 0, y: 40, rotate: -3 }}
            animate={still ? { opacity: 1 } : { opacity: 1, y: 0, rotate: -0.6 }}
            exit={still ? { opacity: 0 } : { opacity: 0, y: 30, rotate: 2 }}
            transition={{ type: 'spring', stiffness: 480, damping: 30 }}
            onPointerEnter={() => setHeld(true)}
            onPointerLeave={() => setHeld(false)}
            onFocus={() => setHeld(true)}
            onBlur={() => setHeld(false)}
            className="pointer-events-auto relative flex max-w-full items-center gap-3 overflow-hidden rounded-card border border-line-strong bg-canvas-raised py-2.5 pr-2.5 pl-4 shadow-lifted"
          >
            <TrashSlip />
            <motion.p
              key={removed.stamp}
              initial={still ? false : { opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className="min-w-0 truncate text-sm font-semibold"
            >
              {label(removed)}
            </motion.p>
            <motion.button
              type="button"
              onClick={onUndo}
              whileTap={still ? undefined : { scale: 0.9, rotate: -8 }}
              className={`flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-sm font-bold transition-colors hover:bg-surface-strong ${accentText[accent]}`}
              aria-keyshortcuts="Control+Z"
            >
              <UndoIcon />
              Undo
            </motion.button>
            {/* The fuse: a thin line that shrinks while the slip is up. */}
            <span
              key={removed.stamp}
              aria-hidden="true"
              className={`undo-fuse absolute bottom-0 left-0 h-0.5 w-full origin-left ${accentFill[accent]}`}
              style={
                {
                  '--fuse': `${UNDO_MS}ms`,
                  animationPlayState: held ? 'paused' : 'running',
                } as CSSProperties
              }
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function TrashSlip() {
  return (
    <svg viewBox="0 0 20 20" className="size-5 shrink-0 text-muted" aria-hidden="true">
      <path
        d="M5 6h10l-.8 10a1.5 1.5 0 0 1-1.5 1.4H7.3A1.5 1.5 0 0 1 5.8 16L5 6ZM3.5 6h13M8 6V4.5h4V6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true">
      <path
        d="M7.5 5 4 8.5 7.5 12M4.5 8.5h7a4.5 4.5 0 0 1 0 9H9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
