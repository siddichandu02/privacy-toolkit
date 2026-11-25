import { motion } from 'framer-motion';
import type { Placement } from '../../lib/pdf/signature-place';
import { useStillMotion } from '../../useStillMotion';
import type { Accent } from '../ui/accent';
import type { Size } from './zoom';

/** Lens diameter in CSS pixels. */
export const LOUPE = 136;
/** How much bigger than the page as shown. */
export const LOUPE_POWER = 2;
const GAP = 28;

export interface LoupeProps {
  /** Pointer position inside the frame. */
  at: { x: number; y: number };
  /** The frame's width, to keep the lens inside it. */
  frameWidth: number;
  pageUrl: string | null;
  signatureUrl: string;
  place: Placement;
  /** The page point to magnify, as fractions of the page. */
  focus: { x: number; y: number };
  /** The page as shown right now, in CSS pixels. */
  page: Size;
  accent: Accent;
}

/**
 * A round magnifier that floats above the pointer while the signature is
 * dragged, showing the page and signature under the finger (which the finger
 * itself hides on a touch screen).
 */
export function Loupe({
  at,
  frameWidth,
  pageUrl,
  signatureUrl,
  place,
  focus,
  page,
  accent,
}: LoupeProps) {
  const still = useStillMotion();
  const r = LOUPE / 2;
  const w = page.width * LOUPE_POWER;
  const h = page.height * LOUPE_POWER;
  const fx = focus.x * w;
  const fy = focus.y * h;

  // Above the finger; below it when there is no room at the top.
  const above = at.y - GAP - LOUPE >= 0;
  const top = above ? at.y - GAP - LOUPE : at.y + GAP;
  const maxLeft = frameWidth - LOUPE;
  const left = Math.max(0, Math.min(maxLeft, at.x - r));

  return (
    <motion.div
      aria-hidden="true"
      data-testid="signature-loupe"
      className="pointer-events-none absolute z-10 overflow-hidden rounded-full bg-white"
      style={{
        left,
        top,
        width: LOUPE,
        height: LOUPE,
        boxShadow: `0 0 0 3px var(--${accent}), 0 0 0 6px color-mix(in srgb, var(--${accent}) 25%, transparent), 0 18px 40px -12px rgba(20,10,60,0.55)`,
      }}
      initial={still ? false : { scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={still ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 30 }}
    >
      <div className="absolute" style={{ width: w, height: h, left: r - fx, top: r - fy }}>
        {pageUrl ? <img src={pageUrl} alt="" className="size-full select-none" /> : null}
        <img
          src={signatureUrl}
          alt=""
          className="absolute select-none"
          style={{
            left: `${place.x * 100}%`,
            top: `${place.y * 100}%`,
            width: `${place.w * 100}%`,
          }}
        />
      </div>
      {/* Crosshair on the point under the pointer. */}
      <span
        className="absolute top-1/2 left-1/2 h-px w-4 -translate-x-1/2"
        style={{ background: `var(--${accent})` }}
      />
      <span
        className="absolute top-1/2 left-1/2 h-4 w-px -translate-y-1/2"
        style={{ background: `var(--${accent})` }}
      />
    </motion.div>
  );
}
