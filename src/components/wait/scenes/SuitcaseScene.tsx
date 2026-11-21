import { motion } from 'framer-motion';
import { useId } from 'react';
import { useStillMotion } from '../../../useStillMotion';
import { Pip } from '../../pip/Pip';
import type { Accent } from '../../ui/accent';

export interface SuitcaseSceneProps {
  /** Overall progress, 0 to 1. The zip pull travels along the seam with it. */
  progress: number;
  accent?: Accent;
  /** The first page of the user's PDF, shown on the luggage tag. */
  thumb?: string;
  className?: string;
}

const W = 300;
const H = 180;
const INK = '#1b1633';
const DESK_Y = 162;
/** Front face of the case. The seam is where the lid meets the body. */
const CASE = { x: 92, w: 130, seam: 122, bottom: 158 };
const LID_H = 16;
/** How far the overstuffed lid gapes open before anything is zipped. */
const GAPE = 14;
const ZIP = { from: CASE.x + 8, to: CASE.x + CASE.w - 8 };

/** Pip is drawn 160 x 180; here it is shrunk to sit on the lid. */
const PIP_H = 0.55 * H;
const PIP_W = (PIP_H * 160) / 180;
/** Pip's seat sits this far down its own drawing. */
const SEAT = 0.93 * PIP_H;

/** Clothes stuffed in the gap: a striped shirt, a sock and a scarf. */
const CLOTHES = [
  { x: CASE.x + 22, w: 30, fill: 'var(--sky)', stripe: '#fbf9ff' },
  { x: CASE.x + 50, w: 26, fill: 'var(--sunshine)', stripe: INK },
  { x: CASE.x + 76, w: 34, fill: 'var(--mint)', stripe: '#fbf9ff' },
] as const;

/**
 * Compress story: Pip bounces on an overstuffed suitcase while the zip pull
 * runs along the seam, tied to real progress. Clothes bulging out of the gap
 * are squeezed back in behind the pull, and Pip cheers once it is shut. With
 * reduced motion nothing bounces.
 */
export function SuitcaseScene({
  progress,
  accent = 'coral',
  thumb,
  className = '',
}: SuitcaseSceneProps) {
  const still = useStillMotion();
  const clip = useId().replace(/:/g, '');
  const tag = { x: CASE.x + CASE.w - 2, y: CASE.seam + 13 };
  const p = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  const zipped = p >= 1;
  const gap = GAPE * (1 - p);
  const lidTop = CASE.seam - LID_H - gap;
  const pull = ZIP.from + (ZIP.to - ZIP.from) * p;
  const pip = accent === 'violet' ? 'coral' : 'violet';
  const shell = `color-mix(in srgb, var(--${accent}) 82%, #1b1033)`;
  const shellLight = `color-mix(in srgb, var(--${accent}) 72%, white)`;
  const spring = still ? { duration: 0 } : { type: 'spring' as const, stiffness: 140, damping: 18 };
  const pipTop = lidTop + 1 - SEAT;
  const bouncing = !still && !zipped;

  return (
    <div
      className={`relative h-full ${className}`}
      style={{ aspectRatio: `${W} / ${H}` }}
      data-testid="suitcase-scene"
      data-zip={Math.round(p * 100)}
      data-zipped={zipped}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
        overflow="visible"
      >
        {/* Floor */}
        <rect x={CASE.x - 22} y={DESK_Y} width={CASE.w + 48} height={7} rx={3} fill="#4b4466" />
        <rect x={CASE.x - 22} y={DESK_Y} width={CASE.w + 48} height={2.4} rx={1.2} fill="#6c6590" />

        {/* Wheels and the shadow under the case */}
        <ellipse cx={CASE.x + CASE.w / 2} cy={DESK_Y} rx={70} ry={3} fill={INK} opacity={0.25} />
        <circle cx={CASE.x + 16} cy={CASE.bottom + 1.5} r={3.4} fill={INK} />
        <circle cx={CASE.x + CASE.w - 16} cy={CASE.bottom + 1.5} r={3.4} fill={INK} />

        {/* Clothes stuffed inside. They only show through the gap under the lid. */}
        <g data-part="clothes">
          {CLOTHES.map((c, i) => (
            <path
              key={i}
              d={`M${c.x} ${CASE.seam - gap - 4} q${c.w / 4} -5 ${c.w / 2} 0 t${c.w / 2} 0 V${CASE.seam + 2} h${-c.w} z`}
              fill={c.fill}
            />
          ))}
          {CLOTHES.map((c, i) => (
            <path
              key={`s${i}`}
              d={`M${c.x + 3} ${CASE.seam - 9} h${c.w - 6} M${c.x + 3} ${CASE.seam - 4} h${c.w - 6}`}
              stroke={c.stripe}
              strokeWidth={1.4}
              strokeLinecap="round"
              opacity={0.7}
            />
          ))}
        </g>

        {/* Body */}
        <rect
          x={CASE.x}
          y={CASE.seam}
          width={CASE.w}
          height={CASE.bottom - CASE.seam}
          rx={6}
          fill={shell}
        />
        <rect
          x={CASE.x + 34}
          y={CASE.seam + 6}
          width={5}
          height={CASE.bottom - CASE.seam - 12}
          rx={2.5}
          fill={INK}
          opacity={0.18}
        />
        <rect
          x={CASE.x + CASE.w - 39}
          y={CASE.seam + 6}
          width={5}
          height={CASE.bottom - CASE.seam - 12}
          rx={2.5}
          fill={INK}
          opacity={0.18}
        />

        {/* Lid, lifted by the bulge and pressed down as the zip closes. */}
        <motion.g initial={false} animate={{ y: lidTop }} transition={spring} data-part="lid">
          <rect x={CASE.x} y={0} width={CASE.w} height={LID_H} rx={6} fill={shell} />
          <rect x={CASE.x + 4} y={2} width={CASE.w - 8} height={3} rx={1.5} fill={shellLight} />
          {/* Handle */}
          <path
            d={`M${CASE.x + CASE.w / 2 - 16} 0 v-5 q0 -3 3 -3 h26 q3 0 3 3 v5`}
            fill="none"
            stroke={INK}
            strokeWidth={3}
            strokeLinejoin="round"
          />
        </motion.g>

        {/* Behind the pull the lid and body are zipped together. */}
        <motion.rect
          data-part="closed"
          x={CASE.x}
          initial={false}
          animate={{ y: CASE.seam - gap - 2, height: gap + 4, width: pull - CASE.x }}
          transition={spring}
          rx={2}
          fill={shell}
        />

        {/* Zipped part of the seam: neat teeth from the start up to the pull. */}
        <motion.line
          data-part="teeth"
          x1={ZIP.from}
          y1={CASE.seam}
          initial={false}
          animate={{ x2: pull }}
          transition={spring}
          y2={CASE.seam}
          stroke={INK}
          strokeWidth={2.4}
          strokeDasharray="1.6 1.6"
        />

        {/* The zip pull itself. */}
        <motion.g
          data-part="pull"
          initial={false}
          animate={{ x: pull, y: CASE.seam - gap / 2 }}
          transition={spring}
        >
          <rect x={-3.5} y={-3} width={7} height={6} rx={1.5} fill="#e8e4f5" stroke={INK} />
          <rect x={-2} y={2.5} width={4} height={9} rx={2} fill="#e8e4f5" stroke={INK} />
        </motion.g>

        {/* Luggage tag, swinging once the case is shut. */}
        <motion.g
          data-part="tag"
          style={{ originX: `${CASE.x + CASE.w - 6}px`, originY: `${CASE.seam + 4}px` }}
          initial={false}
          animate={zipped && !still ? { rotate: [0, 18, -10, 6, 0] } : { rotate: 0 }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
        >
          <path
            d={`M${CASE.x + CASE.w - 6} ${CASE.seam + 4} l8 10`}
            stroke={INK}
            strokeWidth={1}
            fill="none"
          />
          <g transform={`rotate(-12 ${CASE.x + CASE.w + 4} ${CASE.seam + 22})`}>
            <rect
              x={tag.x}
              y={tag.y}
              width={13}
              height={18}
              rx={2}
              fill="var(--sunshine)"
              stroke={INK}
              strokeWidth={0.8}
            />
            {thumb ? (
              <>
                <clipPath id={clip}>
                  <rect x={tag.x + 2} y={tag.y + 3} width={9} height={12} rx={0.8} />
                </clipPath>
                <rect x={tag.x + 2} y={tag.y + 3} width={9} height={12} rx={0.8} fill="#fbf9ff" />
                <image
                  data-part="tag-page"
                  href={thumb}
                  x={tag.x + 2}
                  y={tag.y + 3}
                  width={9}
                  height={12}
                  preserveAspectRatio="xMidYMin slice"
                  clipPath={`url(#${clip})`}
                />
              </>
            ) : null}
          </g>
        </motion.g>
      </svg>

      {/* Pip rides the lid down, bouncing to squash it shut. */}
      <motion.div
        className="absolute"
        style={{
          left: `${((CASE.x + CASE.w / 2 - PIP_W / 2) / W) * 100}%`,
          width: `${(PIP_W / W) * 100}%`,
          height: `${(PIP_H / H) * 100}%`,
        }}
        initial={false}
        animate={{
          top: `${(pipTop / H) * 100}%`,
          y: bouncing ? [0, -6, 0] : 0,
        }}
        transition={{
          top: spring,
          y: bouncing ? { duration: 0.55, ease: 'easeOut', repeat: Infinity } : { duration: 0 },
        }}
        data-part="pip"
        data-bouncing={bouncing}
      >
        <Pip pose={zipped ? 'celebrate' : 'sit'} accent={pip} className="h-full w-full" />
      </motion.div>
    </div>
  );
}
