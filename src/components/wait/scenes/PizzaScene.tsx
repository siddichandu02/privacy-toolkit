import { motion } from 'framer-motion';
import { useId } from 'react';
import { useStillMotion } from '../../../useStillMotion';
import { Pip } from '../../pip/Pip';
import type { Accent } from '../../ui/accent';
import { Helper } from './Helper';
import { With3DHelpers } from './With3DHelpers';
import { Sparkles } from './Sparkles';
import { PageFace } from './PageFace';

export interface PizzaSceneProps {
  /** Overall progress, 0 to 1. A turned page lands on the counter as each share passes. */
  progress: number;
  accent?: Accent;
  /** How many pages Pip spins in the story. */
  pages?: number;
  /** The user's first page, shown on every page Pip spins. Ruled paper when missing. */
  thumb?: string;
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
function Page({
  accent,
  i,
  thumb,
  clip,
}: {
  accent: Accent;
  i: number;
  thumb?: string;
  clip: string;
}) {
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
      {thumb ? (
        <PageFace
          x={x + 3}
          y={y + fold + 1}
          w={w - 6}
          h={h - fold - 4}
          href={thumb}
          accent={accent}
          clip={`${clip}-${i}`}
        />
      ) : null}
      {(thumb ? [] : [0, 1, 2, 3]).map((r) => (
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

/** Finale sparkles, as offsets from the top of the stack. */
const SPARKLES: readonly (readonly [number, number])[] = [
  [-14, -8],
  [12, -16],
  [2, -26],
];

/** Where the paper helper waits on the counter, next to the stack. */
const HELPER_X = 214;

/**
 * Rotate story in three acts. Intro: a paper helper strolls onto the counter
 * and Pip flips the first of the user's pages up off one paw. Action: Pip
 * spins each page like pizza dough and it lands on the counter turned on its
 * side; the helper hops with every landing. Pages follow real progress; only
 * the spin loops. Finale: Pip cheers, the helper bounces and the stack
 * sparkles. With reduced motion everything stands still.
 */
export function PizzaScene({
  progress,
  accent = 'sunshine',
  pages = 5,
  thumb,
  className = '',
}: PizzaSceneProps) {
  const still = useStillMotion();
  const clip = `pizza-${useId().replace(/:/g, '')}`;
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
      data-act={finished ? 'finale' : 'action'}
    >
      <With3DHelpers width={W} height={H}>
        <Pip
          pose={finished ? 'celebrate' : 'hold'}
          accent={pip}
          className="absolute top-0 left-0 h-full"
        />
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
              <Page accent={accent} i={i} thumb={thumb} clip={clip} />
            </motion.g>
          ))}

          {/* The helper strolls in, hops each time a page lands, cheers at the end. */}
          <motion.g
            initial={still ? false : { x: 70 }}
            animate={{ x: 0 }}
            transition={still ? { duration: 0 } : { type: 'spring', stiffness: 90, damping: 16 }}
          >
            <motion.g
              key={finished ? 'cheer' : `hop-${landed}`}
              data-part="helper-hop"
              animate={still || finished ? undefined : landed > 0 ? { y: [0, -7, 0] } : undefined}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <Helper
                x={HELPER_X}
                y={COUNTER_Y - 20}
                color={accent === 'sky' ? 'mint' : 'sky'}
                hopping={!still && finished}
              />
            </motion.g>
          </motion.g>

          {finished ? (
            <Sparkles
              still={still}
              points={SPARKLES.map(([dx, dy]) => ({
                x: STACK_X + dx,
                y: COUNTER_Y - PAGE.w - pages * 4 + dy,
              }))}
            />
          ) : null}

          {/* The paw points up; flour puffs off it while the page spins. */}
          {finished ? null : (
            <path
              d={`M${PAW.x - 2} ${PAW.y - 3} Q${PAW.x + 2} ${PAW.y - 16} ${PAW.x + 6} ${PAW.y - 22}`}
              fill="none"
              stroke="#ffffff"
              strokeWidth={4.5}
              strokeLinecap="round"
            />
          )}
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
              <Page accent={accent} i={landed} thumb={thumb} clip={clip} />
            </motion.g>
          ) : null}
        </svg>
      </With3DHelpers>
    </div>
  );
}
