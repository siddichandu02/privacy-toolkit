import { useState, type CSSProperties, type ReactNode } from 'react';
import { accentFill, type Accent } from './accent';

const focusRing: Record<Accent, string> = {
  violet: 'ring-violet',
  coral: 'ring-coral',
  mint: 'ring-mint',
  sunshine: 'ring-sunshine',
  sky: 'ring-sky',
};

export interface CompareSliderProps {
  /** Picture on the left of the line. */
  before: string | null;
  /** Picture on the right of the line. */
  after: string | null;
  beforeAlt: string;
  beforeLabel?: ReactNode;
  afterLabel?: ReactNode;
  accent: Accent;
  /** Shape of the frame, e.g. "aspect-[16/10]". */
  frameClassName?: string;
  /** How the pictures fill the frame. */
  fit?: 'cover' | 'contain';
  /** Laid over the frame, e.g. a "working" veil while the after picture is redrawn. */
  overlay?: ReactNode;
  /** Width over height; sets the frame's shape instead of `frameClassName`. */
  aspect?: number;
  testId?: string;
}

/**
 * Two pictures stacked in one frame with a line between them. Drag the line,
 * or focus it and use the arrow keys, to see more of one or the other. A
 * plain range input does the work, so it reads well with a screen reader.
 */
export function CompareSlider({
  before,
  after,
  beforeAlt,
  beforeLabel = 'Original',
  afterLabel = 'Compressed',
  accent,
  frameClassName = 'aspect-[16/10]',
  fit = 'cover',
  overlay,
  aspect,
  testId,
}: CompareSliderProps) {
  const [split, setSplit] = useState(50);
  const objectFit = fit === 'cover' ? 'object-cover' : 'object-contain';

  return (
    <div
      data-testid={testId}
      className={`group relative overflow-hidden rounded-panel border border-line bg-canvas-raised shadow-lifted select-none ${aspect ? '' : frameClassName}`}
      style={{ '--split': `${split}%`, aspectRatio: aspect } as CSSProperties}
    >
      {before ? (
        <img
          src={before}
          alt={beforeAlt}
          className={`absolute inset-0 size-full ${objectFit}`}
          draggable={false}
        />
      ) : null}
      {after ? (
        <img
          src={after}
          alt=""
          data-testid={testId ? `${testId}-after` : undefined}
          className={`absolute inset-0 size-full ${objectFit}`}
          style={{ clipPath: 'inset(0 0 0 var(--split))' }}
          draggable={false}
        />
      ) : null}

      <span className="absolute top-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
        {beforeLabel}
      </span>
      <span className="absolute top-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
        {afterLabel}
      </span>

      {overlay}

      {/* The divider and its grip. Purely visual; the range input below does the work. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_12px_rgb(0_0_0/0.45)]"
        style={{ left: 'var(--split)' }}
      >
        <span
          className={`absolute top-1/2 left-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white shadow-lifted transition-transform duration-200 group-hover:scale-110 group-active:scale-95 motion-reduce:transition-none ${accentFill[accent]}`}
        >
          <svg
            viewBox="0 0 24 24"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 6l-5 6 5 6M15 6l5 6-5 6" />
          </svg>
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={split}
        onChange={(e) => setSplit(Number(e.target.value))}
        aria-label="Compare original and compressed"
        aria-valuetext={`${split}% original, ${100 - split}% compressed`}
        className="peer absolute inset-0 size-full cursor-ew-resize opacity-0"
      />
      {/* Focus ring for keyboard users, drawn on the frame. */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 rounded-panel peer-focus-visible:ring-3 peer-focus-visible:ring-inset ${focusRing[accent]}`}
      />
    </div>
  );
}
