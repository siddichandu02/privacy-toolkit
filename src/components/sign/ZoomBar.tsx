import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useStillMotion } from '../../useStillMotion';
import type { Accent } from '../ui/accent';
import { MAX_ZOOM, MIN_ZOOM, zoomLabel, type FitMode } from './zoom';

export interface ZoomBarProps {
  zoom: number;
  fit: FitMode | null;
  accent: Accent;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: (mode: FitMode) => void;
  onActualSize: () => void;
}

/** Zoom controls above the signature placer. */
export function ZoomBar({
  zoom,
  fit,
  accent,
  onZoomIn,
  onZoomOut,
  onFit,
  onActualSize,
}: ZoomBarProps) {
  const label = zoomLabel(zoom);
  return (
    <div
      role="toolbar"
      aria-label="Zoom"
      className="mb-2 flex w-full flex-wrap items-center justify-between gap-2"
    >
      <div className="flex items-center rounded-full border border-line bg-surface p-0.5 shadow-soft backdrop-blur-xl">
        <RoundButton label="Zoom out" disabled={zoom <= MIN_ZOOM + 0.001} onClick={onZoomOut}>
          <path d="M4 8h8" />
        </RoundButton>
        <button
          type="button"
          onClick={onActualSize}
          aria-label={`Zoom ${label}. Show at actual size`}
          title="Actual size"
          data-testid="zoom-level"
          className="h-9 min-w-16 rounded-full px-2 text-sm font-semibold tabular-nums transition-colors hover:bg-surface-strong"
        >
          {label}
        </button>
        <RoundButton label="Zoom in" disabled={zoom >= MAX_ZOOM - 0.001} onClick={onZoomIn}>
          <path d="M4 8h8M8 4v8" />
        </RoundButton>
      </div>
      <p className="sr-only" aria-live="polite">
        {`Zoom ${label}`}
      </p>
      <div className="flex items-center gap-1 rounded-full border border-line bg-surface p-0.5 shadow-soft backdrop-blur-xl">
        <FitButton mode="page" fit={fit} accent={accent} onFit={onFit} label="Fit page">
          <rect x="4" y="2.5" width="8" height="11" rx="1.2" />
          <path d="M6.5 6h3M6.5 8.5h3" />
        </FitButton>
        <FitButton mode="width" fit={fit} accent={accent} onFit={onFit} label="Fit width">
          <path d="M2.5 8h11M4.5 6 2.5 8l2 2M11.5 6l2 2-2 2" />
        </FitButton>
      </div>
    </div>
  );
}

function RoundButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const still = useStillMotion();
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      whileTap={still || disabled ? undefined : { scale: 0.86 }}
      transition={{ type: 'spring', stiffness: 600, damping: 22 }}
      className="grid size-9 place-items-center rounded-full transition-colors hover:bg-surface-strong disabled:opacity-35 disabled:hover:bg-transparent"
    >
      <svg
        viewBox="0 0 16 16"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    </motion.button>
  );
}

function FitButton({
  mode,
  fit,
  accent,
  onFit,
  label,
  children,
}: {
  mode: FitMode;
  fit: FitMode | null;
  accent: Accent;
  onFit: (mode: FitMode) => void;
  label: string;
  children: ReactNode;
}) {
  const still = useStillMotion();
  const on = fit === mode;
  return (
    <motion.button
      type="button"
      aria-pressed={on}
      aria-label={label}
      title={label}
      onClick={() => onFit(mode)}
      whileTap={still ? undefined : { scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 600, damping: 22 }}
      className="relative flex h-9 items-center gap-1.5 rounded-full px-2.5 text-sm font-semibold text-muted transition-colors hover:text-fg aria-pressed:text-fg"
    >
      {on ? (
        <motion.span
          layoutId={still ? undefined : 'zoom-fit'}
          aria-hidden="true"
          className="absolute inset-0 rounded-full"
          style={{ background: `color-mix(in srgb, var(--${accent}) 18%, transparent)` }}
          transition={{ type: 'spring', stiffness: 500, damping: 34 }}
        />
      ) : null}
      <svg
        viewBox="0 0 16 16"
        className="relative size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
      <span className="relative hidden min-[400px]:inline">{label}</span>
    </motion.button>
  );
}
