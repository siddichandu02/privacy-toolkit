import { motion } from 'framer-motion';
import { useStillMotion } from '../../../useStillMotion';
import { Pip } from '../../pip/Pip';
import type { Accent } from '../../ui/accent';

export interface PancakeSceneProps {
  /** Overall progress, 0 to 1. Grows the stack in the pan. */
  progress: number;
  accent?: Accent;
  /** How many pages the stack holds when the merge is done. */
  layers?: number;
  className?: string;
}

/*
 * Shares Pip's coordinate space: Pip fills the left 160 of 300 units at full
 * height, so the pan handle can start exactly where the paw grips it.
 */
const W = 300;
const H = 180;
const PAN_Y = 112;
const PAN_X = 224;
const GRIP = { x: 142, y: 117 };
const PAGE = { w: 44, h: 7 };

/** Paper tinted from the tool accent, a little different on every layer. */
const pageTint = (accent: Accent, i: number) =>
  `color-mix(in srgb, var(--${accent}) ${[12, 30, 20][i % 3]}%, #fbf9ff)`;
const pageEdge = (accent: Accent) => `color-mix(in srgb, var(--${accent}) 60%, #1b1033)`;

/**
 * Merge story: Pip flips loose pages in a pan like pancakes and they land as
 * one growing stack. The stack height follows real progress; only the flip
 * itself loops. With reduced motion everything stands still.
 */
export function PancakeScene({
  progress,
  accent = 'violet',
  layers = 6,
  className = '',
}: PancakeSceneProps) {
  const still = useStillMotion();
  const landed = Math.max(1, Math.min(layers, Math.round(progress * layers)));
  const finished = progress >= 1;
  const pip = accent === 'violet' ? 'coral' : accent;

  return (
    <div
      className={`relative h-full ${className}`}
      style={{ aspectRatio: `${W} / ${H}` }}
      data-testid="pancake-scene"
      data-landed={landed}
    >
      <Pip pose="hold" accent={pip} className="absolute top-0 left-0 h-full" />
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
        overflow="visible"
      >
        <motion.g
          style={{ originX: `${GRIP.x}px`, originY: `${GRIP.y}px`, transformBox: 'view-box' }}
          animate={still || finished ? { rotate: 0 } : { rotate: [0, 0, -9, 3, 0] }}
          transition={{
            duration: 1.5,
            times: [0, 0.35, 0.5, 0.7, 1],
            ease: 'easeInOut',
            repeat: still || finished ? 0 : Infinity,
          }}
        >
          {/* Handle */}
          <path
            d={`M${GRIP.x - 4} ${GRIP.y - 2.5} L${PAN_X - 46} ${PAN_Y - 1.5} L${PAN_X - 46} ${PAN_Y + 3.5} L${GRIP.x - 4} ${GRIP.y + 2.5} Z`}
            fill="#3a3352"
          />
          {/* Stack of merged pages, bottom up */}
          {Array.from({ length: landed }, (_, i) => (
            <motion.g
              key={i}
              initial={still ? false : { y: -26, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 18 }}
            >
              <rect
                x={PAN_X - PAGE.w / 2 + (i % 2 ? 1.5 : -1.5)}
                y={PAN_Y - 6 - (i + 1) * (PAGE.h - 2)}
                width={PAGE.w}
                height={PAGE.h}
                rx={1.5}
                fill={pageTint(accent, i)}
                stroke={pageEdge(accent)}
                strokeWidth={0.8}
              />
            </motion.g>
          ))}
          {/* Pan: rim, body and a soft highlight */}
          <path
            d={`M${PAN_X - 48} ${PAN_Y - 4} Q${PAN_X} ${PAN_Y + 22} ${PAN_X + 48} ${PAN_Y - 4} Z`}
            fill="#2a2440"
          />
          <ellipse cx={PAN_X} cy={PAN_Y - 4} rx={48} ry={4.5} fill="#4a4266" />
          <path
            d={`M${PAN_X - 36} ${PAN_Y + 4} Q${PAN_X - 14} ${PAN_Y + 13} ${PAN_X + 6} ${PAN_Y + 11}`}
            fill="none"
            stroke="rgb(255 255 255 / 0.18)"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </motion.g>

        {/* The page in the air. Leaves the pan as it tips, flips, drops back. */}
        {!still && !finished ? (
          <motion.g
            data-part="flying-page"
            style={{ originX: 0.5, originY: 0.5 }}
            animate={{
              y: [0, 0, -78, -78, 0],
              rotate: [0, 0, 200, 300, 360],
              opacity: [0, 0, 1, 1, 0],
            }}
            transition={{
              duration: 1.5,
              times: [0, 0.4, 0.68, 0.8, 1],
              ease: ['linear', 'easeOut', 'linear', 'easeIn'],
              repeat: Infinity,
            }}
          >
            <rect
              x={PAN_X - PAGE.w / 2}
              y={PAN_Y - 18 - landed * (PAGE.h - 2)}
              width={PAGE.w}
              height={PAGE.h + 2}
              rx={1.5}
              fill={pageTint(accent, landed)}
              stroke={pageEdge(accent)}
              strokeWidth={0.8}
            />
          </motion.g>
        ) : null}

        {/* Warmth rising off the pan */}
        {!still
          ? [-18, 0, 18].map((dx, i) => (
              <motion.path
                key={dx}
                d={`M${PAN_X + dx} ${PAN_Y - 18 - landed * 5} q4 -6 0 -12 q-4 -6 0 -12`}
                fill="none"
                stroke={`var(--${accent})`}
                strokeWidth={1.6}
                strokeLinecap="round"
                animate={{ opacity: [0, 0.55, 0], y: [4, -6, -14] }}
                transition={{ duration: 2.2, delay: i * 0.5, repeat: Infinity, ease: 'easeOut' }}
              />
            ))
          : null}
      </svg>
    </div>
  );
}
