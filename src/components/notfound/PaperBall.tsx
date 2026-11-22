import { motion } from 'framer-motion';
import { useStillMotion } from '../../useStillMotion';

/*
 * The same twelve points, twice: once as a flat sheet, once squeezed into a
 * crumpled ball. Morphing between them unfolds the paper.
 */
const FLAT: [number, number][] = [
  [14, 6],
  [45, 6],
  [75, 6],
  [106, 6],
  [106, 46],
  [106, 74],
  [106, 114],
  [75, 114],
  [45, 114],
  [14, 114],
  [14, 74],
  [14, 46],
];
const SQUEEZE = [36, 27, 40, 31, 38, 26, 37, 30, 41, 29, 35, 25];
const BALL = FLAT.map(([x, y], i): [number, number] => {
  const angle = Math.atan2(y - 60, x - 60);
  const r = SQUEEZE[i] ?? 32;
  return [60 + Math.cos(angle) * r, 60 + Math.sin(angle) * r];
});
const path = (pts: [number, number][]) =>
  `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L')} Z`;

/**
 * The "0" in 404: a crumpled page. Press it and it springs open into a tiny
 * map with a dotted path home. Press again to scrunch it back up.
 */
export function PaperBall({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const still = useStillMotion();
  const spring = still
    ? { duration: 0.2 }
    : { type: 'spring' as const, stiffness: 190, damping: open ? 13 : 18 };

  return (
    <motion.button
      type="button"
      onClick={onToggle}
      aria-pressed={open}
      aria-label={open ? 'Crumple the page back up' : 'Unfold the crumpled page'}
      data-testid="paper-ball"
      className="group relative inline-grid size-[0.95em] place-items-center rounded-3xl align-[-0.12em] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-violet"
      whileHover={
        still || open ? undefined : { rotate: [0, -8, 6, 0], transition: { duration: 0.5 } }
      }
      whileTap={still ? undefined : { scale: 0.9 }}
    >
      <svg viewBox="0 0 120 120" className="size-full overflow-visible" aria-hidden="true">
        <motion.path
          initial={false}
          animate={{ d: path(open ? FLAT : BALL), rotate: open ? 0 : -12 }}
          transition={spring}
          style={{ fill: 'var(--canvas-raised)' }}
          stroke="var(--violet)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* Crumple creases, gone once the page is flat. */}
        <motion.path
          d="M40 44l18 10 6 18M72 38l-8 16 16 10M44 76l20-4"
          fill="none"
          stroke="var(--violet)"
          strokeOpacity="0.45"
          strokeWidth="2.4"
          strokeLinecap="round"
          initial={false}
          animate={{ opacity: open ? 0 : 1 }}
          transition={{ duration: 0.15 }}
        />
        {/* The map: fold lines, a dotted path, and a little house at the end. */}
        <motion.g
          initial={false}
          animate={{ opacity: open ? 1 : 0, scale: open ? 1 : 0.6 }}
          transition={{ ...spring, delay: open && !still ? 0.12 : 0 }}
        >
          <path
            d="M60 8v104M16 60h88"
            stroke="var(--line-strong)"
            strokeWidth="1.5"
            strokeDasharray="3 4"
          />
          <motion.path
            d="M30 92c10-4 8-20 22-24s20 6 30-6 2-24 8-30"
            fill="none"
            stroke="var(--coral)"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeDasharray="1 7"
            initial={false}
            animate={{ pathLength: open ? 1 : 0 }}
            transition={{ duration: still ? 0 : 0.7, delay: open && !still ? 0.25 : 0 }}
          />
          <path
            d="M24 86l12 12M36 86l-12 12"
            stroke="var(--coral)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M80 30l10-9 10 9v11H80Z"
            fill="var(--mint)"
            stroke="var(--mint)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </motion.g>
      </svg>
    </motion.button>
  );
}
