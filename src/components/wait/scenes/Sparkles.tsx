import { motion } from 'framer-motion';

/** A four-point star centred on 0,0, 8 units across. */
const STAR = 'M0 -4 L1 -1 L4 0 L1 1 L0 4 L-1 1 L-4 0 L-1 -1 Z';

export interface Sparkle {
  x: number;
  y: number;
  /** Size multiplier, 1 is 8 units across. */
  s?: number;
}

/**
 * The finale twinkle every scene ends with: a few stars that pop in one
 * after another. With `still` they simply appear.
 */
export function Sparkles({
  points,
  still,
  color = 'var(--sunshine)',
  delay = 0,
}: {
  points: readonly Sparkle[];
  still: boolean;
  color?: string;
  delay?: number;
}) {
  return (
    <g data-part="sparkles">
      {points.map((pt, k) => (
        <g key={k} transform={`translate(${pt.x} ${pt.y}) scale(${pt.s ?? 1})`}>
          <motion.path
            data-part="sparkle"
            d={STAR}
            fill={color}
            initial={still ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: still ? 1 : [0, 1.25, 1], opacity: 1 }}
            transition={still ? { duration: 0 } : { duration: 0.5, delay: delay + 0.12 * k }}
          />
        </g>
      ))}
    </g>
  );
}
