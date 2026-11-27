import { motion } from 'framer-motion';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { NO_EDIT, toDegrees, type PageEdit } from '../../lib/pdf/page-edits';
import { useStillMotion } from '../../useStillMotion';
import type { PdfPages } from '../drop/preview';
import { PageThumb } from '../pages/PageThumb';
import type { Accent } from '../ui/accent';

export interface PageTurnerProps {
  pages: PdfPages;
  accent: Accent;
  /** Edits by page index. Turns are kept as a running count so the spin never jumps back. */
  edits: readonly (PageEdit | undefined)[];
  onTurn: (index: number, by: 1 | -1) => void;
  onToggleKeep: (index: number) => void;
}

/**
 * A grid of pages, each with its own turn left, turn right and remove buttons.
 * A focused tile also answers to R (turn right), Shift+R (turn left) and
 * Delete (remove or bring back).
 */
export function PageTurner({ pages, accent, edits, onTurn, onToggleKeep }: PageTurnerProps) {
  const still = useStillMotion();
  const color = `var(--${accent})`;

  const onKey = (index: number) => (e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      onTurn(index, e.shiftKey ? -1 : 1);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onToggleKeep(index);
    }
  };

  return (
    <ul
      aria-label="Pages"
      className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 min-[420px]:pointer-fine:grid-cols-3"
      style={{ '--turn': color } as CSSProperties}
    >
      {Array.from({ length: pages.count }, (_, i) => {
        const page = i + 1;
        const edit = edits[i] ?? NO_EDIT;
        const angle = toDegrees(edit.turns);
        const removed = !edit.keep;
        const label = `Page ${page}${removed ? ', removed' : angle ? `, turned ${angle} degrees` : ''}`;
        return (
          <li key={page}>
            <div
              role="group"
              tabIndex={0}
              aria-label={label}
              aria-keyshortcuts="R Shift+R Delete"
              data-testid="turn-tile"
              data-angle={angle}
              data-removed={removed}
              onKeyDown={onKey(i)}
              className="group rounded-2xl"
            >
              <div
                className={`relative aspect-square overflow-hidden rounded-2xl border-2 transition-[border-color,background-color] duration-200 ${
                  removed
                    ? 'border-dashed border-coral/60 bg-coral/5'
                    : angle
                      ? 'border-[var(--turn)] bg-[color-mix(in_srgb,var(--turn)_8%,transparent)]'
                      : 'border-line bg-canvas/40 group-hover:border-line-strong'
                }`}
              >
                {/* A portrait page in a square stage, so it fits whichever way it faces. */}
                <motion.div
                  className="absolute inset-y-[6%] right-[17%] left-[17%]"
                  initial={false}
                  animate={{
                    rotate: edit.turns * 90,
                    scale: removed ? 0.82 : 1,
                    opacity: removed ? 0.35 : 1,
                  }}
                  transition={
                    still ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 20 }
                  }
                >
                  <span className="relative block size-full overflow-hidden rounded-md bg-white shadow-[0_6px_16px_-8px_rgb(0_0_0/0.45)]">
                    <PageThumb pages={pages} page={page} />
                  </span>
                </motion.div>

                {angle && !removed ? (
                  <span
                    className="absolute top-1.5 left-1.5 rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums"
                    style={{ background: color, color: 'var(--canvas)' }}
                    data-testid="turn-angle"
                  >
                    {angle}°
                  </span>
                ) : null}
                <span
                  aria-hidden="true"
                  className={`absolute right-1.5 bottom-1.5 hidden min-w-6 rounded-md bg-canvas/85 px-1.5 py-0.5 text-center text-xs font-bold tabular-nums backdrop-blur-sm pointer-coarse:max-sm:block ${removed ? 'text-muted line-through' : 'text-fg'}`}
                >
                  {page}
                </span>
                {removed ? (
                  <span aria-hidden="true" className="absolute inset-0 grid place-items-center">
                    <span className="-rotate-12 rounded-lg border-2 border-coral bg-canvas/90 px-2 py-0.5 font-display text-sm font-extrabold tracking-tight text-coral">
                      Removed
                    </span>
                  </span>
                ) : null}
              </div>

              {/* Narrow touch screens: the number sits on the tile so three
                  finger-sized buttons fit in a two column grid. */}
              <div className="mt-2 flex items-center gap-1 pointer-coarse:max-sm:grid pointer-coarse:max-sm:grid-cols-3">
                <TileButton
                  label={`Turn page ${page} left`}
                  onClick={() => onTurn(i, -1)}
                  disabled={removed}
                >
                  <TurnIcon dir={-1} />
                </TileButton>
                <span
                  className={`flex-1 text-center text-sm font-semibold tabular-nums pointer-coarse:max-sm:hidden ${removed ? 'text-muted line-through' : 'text-fg'}`}
                  aria-hidden="true"
                >
                  {page}
                </span>
                <TileButton
                  label={`Turn page ${page} right`}
                  onClick={() => onTurn(i, 1)}
                  disabled={removed}
                >
                  <TurnIcon dir={1} />
                </TileButton>
                <TileButton
                  label={removed ? `Keep page ${page}` : `Remove page ${page}`}
                  onClick={() => onToggleKeep(i)}
                  pressed={removed}
                  danger
                >
                  {removed ? <UndoIcon /> : <BinIcon />}
                </TileButton>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function TileButton({
  label,
  onClick,
  disabled,
  pressed,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  const still = useStillMotion();
  return (
    <motion.button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      onClick={onClick}
      disabled={disabled}
      whileTap={still || disabled ? undefined : { scale: 0.86 }}
      transition={{ type: 'spring', stiffness: 600, damping: 26 }}
      className={`tap grid size-8 shrink-0 place-items-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-35 pointer-coarse:size-11 pointer-coarse:max-sm:w-full ${
        pressed
          ? 'border-coral/50 bg-coral/15 text-coral'
          : danger
            ? 'border-line text-muted hover:border-coral/50 hover:text-coral'
            : 'border-line text-muted hover:border-[var(--turn)] hover:text-fg'
      }`}
    >
      {children}
    </motion.button>
  );
}

const iconProps = {
  viewBox: '0 0 20 20',
  className: 'size-4',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

/** A curved arrow. Right turns clockwise. */
export function TurnIcon({ dir }: { dir: 1 | -1 }) {
  return (
    <svg {...iconProps} style={dir === -1 ? { transform: 'scaleX(-1)' } : undefined}>
      <path d="M15.5 10.5A5.5 5.5 0 1 1 13.9 6.6" />
      <path d="M14.1 3.2v3.6h-3.6" />
    </svg>
  );
}

function BinIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 6h12M8 6V4.5h4V6M5.5 6l.8 10h7.4l.8-10" />
    </svg>
  );
}

export function UndoIcon() {
  return (
    <svg {...iconProps}>
      <path d="M7 5 4 8l3 3" />
      <path d="M4 8h7.5a4 4 0 0 1 0 8H9" />
    </svg>
  );
}
