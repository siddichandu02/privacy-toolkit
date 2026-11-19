import { motion } from 'framer-motion';
import { useStillMotion } from '../../../useStillMotion';
import { Pip } from '../../pip/Pip';
import type { Accent } from '../../ui/accent';

export interface PizzaSceneProps {
  /** Overall progress, 0 to 1. A turned page lands on the counter as each share passes. */
  progress: number;
  accent?: Accent;
  /** How many pages Pip spins in the story. */
  pages?: number;
  className?: string;
}

/*
 * Same coordinate space as Pip (left 160 of 300 units, full height). Pip's
 * `hold` paw is at (142, 117); the page spins on a cushion of air above it.
 */
const W = 300;
const H = 180;
const PAW = { x: 142, y: 117 };
const SPIN = { x: 150, y: 66 };
const PAGE = { w: 34, h: 44 };
const COUNTER_Y = 156;
/** Middle of the stack of finished pages on the counter. */
const STACK_X = 246;

const paper = (accent: Accent, i: number) =>
  `color-mix(in srgb, var(--${accent}) ${[14, 26, 20][i % 3]}%, #fbf9ff)`;
const edge = (accent: Accent) => `color-mix(in srgb, var(--${accent}) 60%, #1b1033)`;

/** A portrait page drawn around its own centre, with a folded corner and text lines. */
function Page({ accent, i }: { accent: Accent; i: number }) {
  const { w, h } = PAGE;
  const x = -w / 2;
  const y = -h / 2;
  const fold = 8;
  return (
    <>
      <path
        d={`M${x} ${y} H${x + w - fold} L${x + w} ${y + fold} V${y + h} H${x} Z`}
        fill={paper(accent, i)}
        stroke={edge(accent)}
        strokeWidth={0.9}
        strokeLinejoin="round"
      />
      <path
        d={`M${x + w - fold} ${y} V${y + fold} H${x + w}`}
        fill={`color-mix(in srgb, var(--${accent}) 45%, #fbf9ff)`}
        stroke={edge(accent)}
        strokeWidth={0.9}
        strokeLinejoin="round"
      />
      {[0, 1, 2, 3].map((r) => (
        <line
          key={r}
          x1={x + 6}
          x2={x + w - (r === 3 ? 16 : 6)}
          y1={y + 15 + r * 7}
          y2={y + 15 + r * 7}
          stroke={edge(accent)}
          strokeWidth={1.4}
          strokeLinecap="round"
          opacity={0.35}
        />
      ))}
    </>
  );
}

/**
 * Rotate story: Pip spins a page over one paw like pizza dough, and each
 * finished page lands on the counter turned on its side. Pages follow real
 * progress; only the spin loops. With reduced motion everything stands still.
 */
export function PizzaScene({
  progress,
  accent = 'sunshine',
  pages = 5,
  className = '',
}: PizzaSceneProps) {
  const still = useStillMotion();
  const p = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  const landed = Math.min(pages, Math.floor(p * pages + 1e-9));
  const finished = landed >= pages;
  const spinning = !still && !finished;
  const pip = accent === 'coral' ? 'violet' : 'coral';
  const spring = still ? { duration: 0 } : { type: 'spring' as const, stiffness: 180, damping: 17 };

  return (
    <div
      className={`relative h-full ${className}`}
      style={{ aspectRatio: `${W} / ${H}` }}
      data-testid="pizza-scene"
      data-landed={landed}
    >
      <Pip pose="hold" accent={pip} className="absolute top-0 left-0 h-full" />
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
        overflow="visible"
      >
        {/* Counter */}
        <rect x={198} y={COUNTER_Y} width={94} height={8} rx={3} fill="#4b4466" />
        <rect x={198} y={COUNTER_Y} width={94} height={2.5} rx={1.2} fill="#6c6590" />

        {/* Pages already turned, stacked on their sides. */}
        {Array.from({ length: landed }, (_, i) => (
          <motion.g
            key={i}
            data-part="page-landed"
            initial={still ? false : { x: SPIN.x, y: SPIN.y, rotate: 0, scale: 1 }}
            animate={{
              x: STACK_X + (i % 2 ? 1.5 : -1.5),
              y: COUNTER_Y - PAGE.w / 2 - 1 - i * 4,
              rotate: 90 + (i % 2 ? 3 : -2),
              scale: 1,
            }}
            transition={spring}
          >
            <Page accent={accent} i={i} />
          </motion.g>
        ))}

        {/* The paw points up; flour puffs off it while the page spins. */}
        <path
          d={`M${PAW.x - 2} ${PAW.y - 3} Q${PAW.x + 2} ${PAW.y - 16} ${PAW.x + 6} ${PAW.y - 22}`}
          fill="none"
          stroke="#ffffff"
          strokeWidth={4.5}
          strokeLinecap="round"
        />
        {spinning
          ? [-6, 0, 7].map((dx, i) => (
              <motion.circle
                key={dx}
                data-part="flour"
                cx={PAW.x + 6 + dx}
                cy={PAW.y - 26}
                r={1.6}
                fill="#ffffff"
                animate={{ y: [0, -10, -16], x: [0, dx * 0.8, dx * 1.6], opacity: [0, 0.9, 0] }}
                transition={{ duration: 1, delay: i * 0.3, repeat: Infinity, ease: 'easeOut' }}
              />
            ))
          : null}

        {/* Swirl lines that show the spin. */}
        {spinning ? (
          <motion.g
            data-part="swirl"
            style={{ originX: `${SPIN.x}px`, originY: `${SPIN.y}px`, transformBox: 'view-box' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1.4, ease: 'linear', repeat: Infinity }}
          >
            {[0, 120, 240].map((a) => (
              <path
                key={a}
                d={`M${SPIN.x + 32} ${SPIN.y} A32 32 0 0 1 ${SPIN.x + 32 * Math.cos(0.9)} ${SPIN.y + 32 * Math.sin(0.9)}`}
                transform={`rotate(${a} ${SPIN.x} ${SPIN.y})`}
                fill="none"
                stroke={`var(--${accent})`}
                strokeWidth={2}
                strokeLinecap="round"
                opacity={0.55}
              />
            ))}
          </motion.g>
        ) : null}

        {/* The page on the go. It bobs up and down and spins around. */}
        {!finished ? (
          <motion.g
            key={`spin-${landed}`}
            data-part="page-spinning"
            data-spinning={spinning}
            initial={still ? false : { x: PAW.x + 6, y: PAW.y - 24, scale: 0.4, rotate: 0 }}
            animate={
              spinning
                ? { x: SPIN.x, y: [SPIN.y, SPIN.y - 7, SPIN.y], scale: 1, rotate: [0, 360] }
                : { x: SPIN.x, y: SPIN.y, scale: 1, rotate: -12 }
            }
            transition={
              spinning
                ? {
                    x: { type: 'spring', stiffness: 200, damping: 18 },
                    scale: { type: 'spring', stiffness: 200, damping: 18 },
                    y: { duration: 1.1, ease: 'easeInOut', repeat: Infinity },
                    rotate: { duration: 0.9, ease: 'linear', repeat: Infinity },
                  }
                : { duration: 0 }
            }
          >
            <Page accent={accent} i={landed} />
          </motion.g>
        ) : null}
      </svg>
    </div>
  );
}
