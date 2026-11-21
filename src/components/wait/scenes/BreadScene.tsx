import { motion } from 'framer-motion';
import { useId } from 'react';
import { useStillMotion } from '../../../useStillMotion';
import { Pip } from '../../pip/Pip';
import type { Accent } from '../../ui/accent';
import { Helper } from './Helper';
import { Sparkles } from './Sparkles';
import { PageFace } from './PageFace';

export interface BreadSceneProps {
  /** Overall progress, 0 to 1. Each slice falls off the loaf as it passes. */
  progress: number;
  accent?: Accent;
  /** How many slices the loaf has. */
  slices?: number;
  /** The user's first page, baked into every slice. Plain paper when missing. */
  thumb?: string;
  className?: string;
}

/*
 * Same coordinate space as Pip (left 160 of 300 units, full height), so the
 * knife handle starts in the paw of the `hold` pose at (142, 117).
 */
const W = 300;
const H = 180;
const GRIP = { x: 142, y: 117 };
const BOARD_Y = 156;
const SLICE = { w: 14, h: 30 };
/** Where the knife meets the loaf; the uncut loaf always starts here. */
const CUT_X = 201;
/** Where the newest cut slice comes to rest, leaning on the ones before. */
const REST_X = 181;

const paper = (accent: Accent, i: number) =>
  `color-mix(in srgb, var(--${accent}) ${[16, 30, 22][i % 3]}%, #fbf9ff)`;
const crust = (accent: Accent) => `color-mix(in srgb, var(--${accent}) 75%, #5a2a1a)`;
const edge = (accent: Accent) => `color-mix(in srgb, var(--${accent}) 60%, #1b1033)`;

/** One slice of the loaf: a stack of pages with a baked, domed top. */
function Slice({
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
  const { w } = SLICE;
  const top = BOARD_Y - SLICE.h;
  // A slice of bread: straight sides, a top that bulges a touch past them.
  const outline = `M0.5 ${BOARD_Y} L0.5 ${top + 9} Q-1 ${top + 1} ${w / 2} ${top} Q${w + 1} ${top + 1} ${w - 0.5} ${top + 9} L${w - 0.5} ${BOARD_Y} Z`;
  const cap = `M0.5 ${top + 9} Q-1 ${top + 1} ${w / 2} ${top} Q${w + 1} ${top + 1} ${w - 0.5} ${top + 9} L${w - 1.5} ${top + 10} Q${w / 2} ${top + 4} 1.5 ${top + 10} Z`;
  return (
    <>
      <path d={outline} fill={paper(accent, i)} stroke={edge(accent)} strokeWidth={0.8} />
      <path d={cap} fill={crust(accent)} />
      {thumb ? (
        <PageFace
          x={1.6}
          y={top + 11}
          w={w - 3.2}
          h={SLICE.h - 13}
          href={thumb}
          accent={accent}
          clip={`${clip}-${i}`}
        />
      ) : null}
      {/* Page edges */}
      {(thumb ? [] : [4.5, 9.5]).map((x) => (
        <line
          key={x}
          x1={x}
          y1={top + 11}
          x2={x}
          y2={BOARD_Y - 3}
          stroke={edge(accent)}
          strokeWidth={0.5}
          opacity={0.45}
        />
      ))}
    </>
  );
}

/** Where the helper hops down once the loaf is too short to ride. */
const HOP_OFF_X = 262;
/** The helper never rides closer to the knife than this. */
const RIDE_MIN_X = 236;

/**
 * Split story in three acts. Intro: a paper helper rides the loaf in along
 * the board. Action: Pip saws slices made of the user's own pages and they tip
 * over into a neat row, one per stretch of real progress; the helper rides
 * the shrinking loaf and hops off when it gets short. Finale: the knife lifts,
 * the helper cheers and the row of slices sparkles. With reduced motion
 * everything stands still.
 */
export function BreadScene({
  progress,
  accent = 'coral',
  slices = 6,
  thumb,
  className = '',
}: BreadSceneProps) {
  const still = useStillMotion();
  const clip = `bread-${useId().replace(/:/g, '')}`;
  const p = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  const cut = Math.min(slices, Math.floor(p * slices + 1e-9));
  const finished = p >= 1;
  const sawing = !still && !finished;
  const pip = accent === 'coral' ? 'sunshine' : accent;
  const spring = still ? { duration: 0 } : { type: 'spring' as const, stiffness: 260, damping: 18 };
  const left = slices - cut;
  const rideX = CUT_X + (left - 0.5) * SLICE.w;
  const riding = left > 0 && rideX >= RIDE_MIN_X;
  const helper = riding
    ? { x: rideX, y: BOARD_Y - SLICE.h - 20 }
    : { x: HOP_OFF_X, y: BOARD_Y - 20 };
  const rowLeft = REST_X - (cut - 1) * 6;

  return (
    <div
      className={`relative h-full ${className}`}
      style={{ aspectRatio: `${W} / ${H}` }}
      data-testid="bread-scene"
      data-cut={cut}
      data-act={finished ? 'finale' : 'action'}
      data-helper={riding ? 'riding' : 'board'}
    >
      <Pip pose="hold" accent={pip} className="absolute top-0 left-0 h-full" />
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
        overflow="visible"
      >
        {/* Cutting board */}
        <rect x={146} y={BOARD_Y} width={146} height={8} rx={3} fill="#6b4a3a" />
        <rect x={146} y={BOARD_Y} width={146} height={2.5} rx={1.2} fill="#8a6450" />
        <circle cx={284} cy={BOARD_Y + 4} r={1.6} fill="#3d2a22" />

        {/* Slices already cut, leaning left in a row. Newest sits nearest the knife. */}
        {Array.from({ length: cut }, (_, i) => {
          const fromNewest = cut - 1 - i;
          return (
            <motion.g
              key={`cut-${i}`}
              data-part="slice-cut"
              style={{ originX: '0px', originY: `${BOARD_Y}px`, transformBox: 'view-box' }}
              initial={still ? false : { x: CUT_X, rotate: 0 }}
              animate={{ x: REST_X - fromNewest * 6, rotate: -18 }}
              transition={spring}
            >
              <Slice accent={accent} i={i} thumb={thumb} clip={clip} />
            </motion.g>
          );
        })}

        {/* What is left of the loaf, slid up to the knife. */}
        {Array.from({ length: slices - cut }, (_, j) => {
          const i = cut + j;
          return (
            <motion.g
              key={`loaf-${i}`}
              data-part="slice-loaf"
              initial={still ? false : { x: CUT_X + j * SLICE.w + 120 }}
              animate={{ x: CUT_X + j * SLICE.w }}
              transition={spring}
            >
              <Slice accent={accent} i={i} thumb={thumb} clip={clip} />
            </motion.g>
          );
        })}

        {/* The helper rides in on the loaf, then hops down to watch. */}
        <motion.g
          initial={still ? false : { x: helper.x + 120, y: helper.y }}
          animate={{ x: helper.x, y: helper.y }}
          transition={spring}
        >
          <Helper
            x={0}
            y={0}
            color={accent === 'mint' ? 'sky' : 'mint'}
            sitting={riding && !finished}
            hopping={!still && (finished || !riding)}
          />
        </motion.g>

        {/* Finale: the row of slices sparkles. */}
        {finished && cut > 0 ? (
          <Sparkles
            still={still}
            points={[0, 1, 2].map((k) => ({
              x: rowLeft + 4 + k * Math.max(6, (cut - 1) * 3),
              y: BOARD_Y - SLICE.h - 6 - (k % 2) * 7,
            }))}
          />
        ) : null}

        {/* Crumbs popping out of the cut */}
        {sawing
          ? [-4, 3, 7].map((dx, i) => (
              <motion.circle
                key={dx}
                data-part="crumbs"
                cx={CUT_X + dx}
                cy={BOARD_Y - SLICE.h + 2}
                r={1.3}
                fill={crust(accent)}
                animate={{ y: [0, -9, 4], x: [0, dx * 1.6, dx * 2.4], opacity: [0, 1, 0] }}
                transition={{ duration: 0.7, delay: i * 0.22, repeat: Infinity, ease: 'easeOut' }}
              />
            ))
          : null}

        {/* The knife saws along its own length, then lifts clear once done. */}
        <motion.g
          data-part="knife"
          data-sawing={sawing}
          animate={
            sawing
              ? { x: [0, 3.2, -2.4, 0], y: [0, 4, -3, 0] }
              : { x: 0, y: finished && !still ? -6 : 0 }
          }
          transition={
            sawing
              ? { duration: 0.55, ease: 'easeInOut', repeat: Infinity }
              : { type: 'spring', stiffness: 300, damping: 20 }
          }
        >
          {/* Handle, from the paw up to the bolster */}
          <path
            d={`M${GRIP.x - 3} ${GRIP.y + 3} L${GRIP.x + 30} ${GRIP.y - 17} L${GRIP.x + 27} ${GRIP.y - 22} L${GRIP.x - 5} ${GRIP.y - 3} Z`}
            fill="#3a3352"
          />
          <circle cx={GRIP.x + 11} cy={GRIP.y - 7} r={1.1} fill="#8b84a8" />
          <circle cx={GRIP.x + 21} cy={GRIP.y - 13} r={1.1} fill="#8b84a8" />
          <path d="M168 99 L174 94 L178 98 L172 103 Z" fill="#8b84a8" />
          {/* Blade: spine to the right, edge down through the loaf */}
          <path d="M172 101 L178 96 Q200 116 209 153 L206 154 Z" fill="#dcdcec" />
          <path d="M172 101 L206 154" stroke="#9c9cb8" strokeWidth={1.2} strokeLinecap="round" />
          <path
            d="M179 101 Q195 118 202 138"
            fill="none"
            stroke="rgb(255 255 255 / 0.7)"
            strokeWidth={1.2}
            strokeLinecap="round"
          />
        </motion.g>
      </svg>
    </div>
  );
}
