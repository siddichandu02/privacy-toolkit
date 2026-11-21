import { motion } from 'framer-motion';
import { useId } from 'react';
import { useStillMotion } from '../../../useStillMotion';
import { Pip } from '../../pip/Pip';
import type { Accent } from '../../ui/accent';
import { Helper } from './Helper';
import { Sparkles } from './Sparkles';
import { PageFace } from './PageFace';

export interface QuillSceneProps {
  /** Overall progress, 0 to 1. Drives the dip, the signature and the flourish. */
  progress: number;
  accent?: Accent;
  /** The user's first page, shown on the sheet being signed. */
  thumb?: string;
  className?: string;
}

export type QuillPhase = 'dipping' | 'signing' | 'flourish' | 'done';

/*
 * Same coordinate space as Pip (left 160 of 300 units, full height). The
 * sheet sits just past Pip's paw so the quill's feather reaches back to it.
 */
const W = 300;
const H = 180;
const DESK_Y = 160;
const SHEET = { x: 156, y: 98, w: 100, h: 60 };
const BASE_Y = 141;
const WELL = { x: 276, y: 146 };
const DIP_END = 0.15;
const SIGN_END = 0.85;

const INK = '#1b1633';
const SIGNATURE = 'M168 139 Q171 116 178 133 T189 135 T199 131 T209 135 T219 131 T229 135 T240 129';
const FLOURISH = 'M163 147 Q204 154 246 139';

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Which part of the story a given progress shows. */
function quillPhase(p: number): QuillPhase {
  if (p >= 1) return 'done';
  if (p < DIP_END) return 'dipping';
  if (p < SIGN_END) return 'signing';
  return 'flourish';
}

/** A quill drawn with its nib at (0, 0) and the feather leaning back up-left. */
function Quill({ accent }: { accent: Accent }) {
  const vane = `color-mix(in srgb, var(--${accent}) 22%, #fbf9ff)`;
  return (
    <>
      <path
        d="M-2 -5 C3 -17 -9 -33 -34 -42 C-25 -35 -17 -22 -13 -13 C-10 -8 -6 -6 -2 -5Z"
        fill={vane}
        stroke={INK}
        strokeWidth={0.7}
        strokeLinejoin="round"
      />
      <path
        d="M-1 -3 Q-12 -20 -34 -42"
        fill="none"
        stroke={INK}
        strokeWidth={0.9}
        strokeLinecap="round"
      />
      <path d="M-16 -22 l-5 1 M-20 -27 l-5 0 M-12 -16 l-4 2" stroke={INK} strokeWidth={0.5} />
      <path d="M0 0 L-2.6 -5.2 L-0.6 -5.8Z" fill={INK} />
    </>
  );
}

/** The little page preview in the sheet's top-left corner. */
const PREVIEW = { x: SHEET.x + 8, y: SHEET.y + 5, w: 20, h: 26 };
/** Where the wax seal lands once the signature is done. */
const SEAL = { x: SHEET.x + SHEET.w - 14, y: BASE_Y + 6 };

/**
 * Sign story in three acts. Intro: a paper helper slides the user's own page
 * onto the desk and sits on its corner to hold it flat. Action: Pip dips a
 * quill in the ink well while the PDF is read, writes a signature along the
 * line as pages are stamped, then underlines it with a flourish while the
 * file is saved. The ink follows real progress. Finale: the helper hops and
 * presses a wax seal on the page. Only the dip bob loops; with reduced motion
 * everything stands still.
 */
export function QuillScene({ progress, accent = 'sky', thumb, className = '' }: QuillSceneProps) {
  const still = useStillMotion();
  const clip = `quill-${useId().replace(/:/g, '')}`;
  const p = Number.isFinite(progress) ? clamp01(progress) : 0;
  const phase = quillPhase(p);
  const sign = clamp01((p - DIP_END) / (SIGN_END - DIP_END));
  const flourish = clamp01((p - SIGN_END) / (1 - SIGN_END));
  const pip = accent === 'coral' ? 'violet' : 'coral';
  const ink = `color-mix(in srgb, var(--${accent}) 45%, ${INK})`;
  const sheet = `color-mix(in srgb, var(--${accent}) 6%, #fbf9ff)`;

  // Where the nib is: in the well, along the signature, or along the swoop.
  const nib =
    phase === 'dipping'
      ? { x: WELL.x, y: WELL.y - 6 }
      : phase === 'signing'
        ? { x: 168 + 72 * sign, y: 133 + Math.sin(sign * Math.PI * 7) * 3.5 }
        : phase === 'flourish'
          ? { x: 163 + 83 * flourish, y: 147 - 8 * flourish * flourish + 4 * flourish }
          : { x: WELL.x + 2, y: WELL.y - 10 };
  const spring = still
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 140, damping: 18, mass: 0.6 };
  const draw = still ? { duration: 0 } : { duration: 0.35, ease: 'easeOut' as const };

  return (
    <div
      className={`relative h-full ${className}`}
      style={{ aspectRatio: `${W} / ${H}` }}
      data-testid="quill-scene"
      data-phase={phase}
    >
      <Pip
        pose={phase === 'done' ? 'celebrate' : 'hold'}
        accent={pip}
        className="absolute top-0 left-0 h-full"
      />
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
        overflow="visible"
      >
        {/* Desk */}
        <rect x={150} y={DESK_Y} width={146} height={7} rx={3} fill="#4b4466" />
        <rect x={150} y={DESK_Y} width={146} height={2.4} rx={1.2} fill="#6c6590" />

        {/* The sheet with a signing line and a little cross, slid in by the helper. */}
        <motion.g
          initial={still ? false : { x: 90, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={still ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 17 }}
        >
          <g transform={`rotate(-3 ${SHEET.x + SHEET.w / 2} ${SHEET.y + SHEET.h})`}>
            <rect
              x={SHEET.x + 1}
              y={SHEET.y + 1.5}
              width={SHEET.w}
              height={SHEET.h}
              rx={2}
              fill={INK}
              opacity={0.18}
            />
            <rect x={SHEET.x} y={SHEET.y} width={SHEET.w} height={SHEET.h} rx={2} fill={sheet} />
            <rect
              x={PREVIEW.x - 0.8}
              y={PREVIEW.y - 0.8}
              width={PREVIEW.w + 1.6}
              height={PREVIEW.h + 1.6}
              rx={1.2}
              fill="#fbf9ff"
              stroke={INK}
              strokeWidth={0.5}
              strokeOpacity={0.3}
            />
            <PageFace {...PREVIEW} href={thumb} accent={accent} clip={`${clip}-page`} />
            {[108, 115, 122].map((y) => (
              <rect
                key={y}
                x={PREVIEW.x + PREVIEW.w + 6}
                y={y}
                width={y === 122 ? 30 : 56}
                height={2}
                rx={1}
                fill={INK}
                opacity={0.12}
              />
            ))}
            <path
              d={`M${SHEET.x + 6} ${BASE_Y} H${SHEET.x + SHEET.w - 8}`}
              stroke={INK}
              strokeWidth={0.8}
              strokeDasharray="2 2"
              opacity={0.45}
            />
            <path
              d={`M${SHEET.x + 5} ${BASE_Y - 7} l4 4 m0 -4 l-4 4`}
              stroke={INK}
              strokeWidth={0.9}
              strokeLinecap="round"
              opacity={0.5}
            />

            {/* Ink, drawn exactly as far as the work has got. */}
            <motion.path
              data-part="signature"
              data-drawn={sign.toFixed(2)}
              d={SIGNATURE}
              fill="none"
              stroke={ink}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={false}
              animate={{ pathLength: sign, opacity: sign > 0 ? 1 : 0 }}
              transition={draw}
            />
            <motion.path
              data-part="flourish"
              d={FLOURISH}
              fill="none"
              stroke={ink}
              strokeWidth={1.4}
              strokeLinecap="round"
              initial={false}
              animate={{ pathLength: flourish, opacity: flourish > 0 ? 1 : 0 }}
              transition={draw}
            />

            {/* Finale: a wax seal pressed onto the corner. */}
            {phase === 'done' ? (
              <motion.g
                data-part="seal"
                initial={still ? false : { scale: 1.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{ transformBox: 'fill-box', originX: '50%', originY: '50%' }}
                transition={
                  still
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 380, damping: 14, delay: 0.25 }
                }
              >
                <circle cx={SEAL.x} cy={SEAL.y} r={6.5} fill={`var(--${accent})`} />
                <circle
                  cx={SEAL.x}
                  cy={SEAL.y}
                  r={4.6}
                  fill="none"
                  stroke="#fbf9ff"
                  strokeWidth={0.6}
                  opacity={0.7}
                />
                <path
                  d={`M${SEAL.x - 2.4} ${SEAL.y} l1.7 1.8 l3.2 -3.6`}
                  fill="none"
                  stroke="#fbf9ff"
                  strokeWidth={1.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </motion.g>
            ) : null}
          </g>
        </motion.g>

        {/* The helper sits on the sheet's corner, then hops when it is signed. */}
        <motion.g
          initial={still ? false : { x: 90 }}
          animate={{ x: phase === 'done' ? -32 : 0 }}
          transition={still ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 17 }}
        >
          <Helper
            x={SHEET.x + SHEET.w - 10}
            y={SHEET.y - 15}
            color={accent === 'mint' ? 'sunshine' : 'mint'}
            sitting={phase !== 'done'}
            hopping={!still && phase === 'done'}
          />
        </motion.g>

        {/* Ink well */}
        <ellipse cx={WELL.x} cy={DESK_Y} rx={11} ry={2} fill={INK} opacity={0.2} />
        <path
          d={`M${WELL.x - 9} ${DESK_Y} L${WELL.x - 10} ${WELL.y + 4} Q${WELL.x} ${WELL.y - 2} ${WELL.x + 10} ${WELL.y + 4} L${WELL.x + 9} ${DESK_Y} Z`}
          fill={INK}
          opacity={0.85}
        />
        <rect x={WELL.x - 5} y={WELL.y - 2} width={10} height={5} rx={1.5} fill={INK} />
        <ellipse cx={WELL.x} cy={WELL.y - 2} rx={5} ry={1.4} fill={ink} />
        <path
          d={`M${WELL.x - 7} ${WELL.y + 6} q1 6 0 11`}
          stroke="#fbf9ff"
          strokeWidth={1.2}
          strokeLinecap="round"
          opacity={0.35}
        />

        {/* The quill follows the nib position; it bobs in the well while dipping. */}
        <motion.g
          data-part="quill"
          data-dipping={phase === 'dipping' && !still}
          initial={false}
          animate={
            phase === 'dipping' && !still
              ? { x: nib.x, y: [nib.y, nib.y + 4, nib.y], rotate: [0, 6, 0] }
              : { x: nib.x, y: nib.y, rotate: phase === 'done' ? 18 : 0 }
          }
          transition={
            phase === 'dipping' && !still
              ? {
                  x: spring,
                  y: { duration: 0.9, ease: 'easeInOut', repeat: Infinity },
                  rotate: { duration: 0.9, ease: 'easeInOut', repeat: Infinity },
                }
              : spring
          }
        >
          <Quill accent={accent} />
        </motion.g>

        {/* A couple of sparkles when the signature is finished. */}
        {phase === 'done' ? (
          <Sparkles
            still={still}
            delay={0.1}
            points={[
              { x: 250, y: 120, s: 1.25 },
              { x: 240, y: 106, s: 0.75 },
            ]}
          />
        ) : null}
      </svg>
    </div>
  );
}
