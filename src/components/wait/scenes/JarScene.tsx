import { motion } from 'framer-motion';
import { useId } from 'react';
import { useStillMotion } from '../../../useStillMotion';
import { Pip } from '../../pip/Pip';
import type { Accent } from '../../ui/accent';

export interface JarSceneProps {
  /** Story progress, 0 to 1. Fills the jar; 1 plays the finale. */
  progress: number;
  accent?: Accent;
  /** First-page pictures of the user's files. Plain paper when empty. */
  thumbs?: readonly string[];
  className?: string;
}

const W = 320;
const H = 180;
const GROUND = 172;
/** Pip stands on the left at two thirds size; the paw sits here. */
const PIP_H = 120;
const PIP_X = 2;
const PAW = { x: PIP_X + 142 * (PIP_H / 180), y: GROUND - PIP_H + 117 * (PIP_H / 180) };
const JAR = { cx: 202, mouth: 54, left: 154, right: 250, bottom: 168 };
const PAGE = { w: 13, h: 17 };
/** How many pages end up swirling in the jar. */
const SLOTS = 6;

const jarPath = `M${JAR.cx - 22} ${JAR.mouth} L${JAR.cx - 22} ${JAR.mouth + 8}
  Q${JAR.left} ${JAR.mouth + 12} ${JAR.left} ${JAR.mouth + 32}
  L${JAR.left} ${JAR.bottom - 14} Q${JAR.left} ${JAR.bottom} ${JAR.left + 14} ${JAR.bottom}
  L${JAR.right - 14} ${JAR.bottom} Q${JAR.right} ${JAR.bottom} ${JAR.right} ${JAR.bottom - 14}
  L${JAR.right} ${JAR.mouth + 32} Q${JAR.right} ${JAR.mouth + 12} ${JAR.cx + 22} ${JAR.mouth + 8}
  L${JAR.cx + 22} ${JAR.mouth} Z`;

const HELPERS: { color: Accent; x: number; delay: number }[] = [
  { color: 'mint', x: 278, delay: 0 },
  { color: 'sunshine', x: 304, delay: 0.9 },
];

/**
 * Merge story in three acts. Intro: the jar lands and Pip's paper helpers
 * march in. Action: Pip and the helpers toss the user's own pages into a
 * glass jar while a third helper rides the giant spoon, stirring; the jar
 * fills with real progress. Finale: the jar shakes and one bound document
 * pops out of the top with a sparkle.
 */
export function JarScene({
  progress,
  accent = 'violet',
  thumbs = [],
  className = '',
}: JarSceneProps) {
  const still = useStillMotion();
  const id = useId().replace(/:/g, '');
  const finished = progress >= 1;
  const inJar = Math.max(1, Math.min(SLOTS, Math.ceil(progress * SLOTS)));
  const level = 0.15 + 0.7 * progress;
  const pip = accent === 'violet' ? 'coral' : accent;
  const tint = `var(--${accent})`;
  const thumb = (i: number) => (thumbs.length ? thumbs[i % thumbs.length] : undefined);
  const moving = !still && !finished;

  return (
    <div
      className={`relative h-full ${className}`}
      style={{ aspectRatio: `${W} / ${H}` }}
      data-testid="jar-scene"
      data-in-jar={inJar}
      data-act={finished ? 'finale' : 'action'}
    >
      <Pip
        pose={finished ? 'celebrate' : 'hold'}
        accent={pip}
        className="absolute bottom-[4.4%] left-[0.6%] h-[66.7%]"
      />
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
        overflow="visible"
      >
        <defs>
          <clipPath id={`${id}-glass`}>
            <path d={jarPath} />
          </clipPath>
          <linearGradient id={`${id}-shine`} x1="0" x2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.32" />
            <stop offset="0.35" stopColor="#fff" stopOpacity="0.06" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.14" />
          </linearGradient>
        </defs>

        {/* Ground shadow under the jar */}
        <ellipse cx={JAR.cx} cy={GROUND} rx={54} ry={4} fill="rgb(27 16 51 / 0.18)" />

        <motion.g
          initial={still ? false : { y: -30, opacity: 0 }}
          animate={
            finished && !still
              ? {
                  y: 0,
                  opacity: 1,
                  x: [0, -3, 3, -2.5, 2.5, -1, 0],
                  rotate: [0, -2, 2, -1.5, 1.5, 0, 0],
                }
              : { y: 0, opacity: 1 }
          }
          transition={
            finished
              ? { duration: 0.6, ease: 'easeInOut' }
              : { type: 'spring', stiffness: 260, damping: 16 }
          }
          style={{ originX: `${JAR.cx}px`, originY: `${JAR.bottom}px`, transformBox: 'view-box' }}
        >
          {/* Inside the glass: liquid, swirl, bubbles and the pages */}
          <g clipPath={`url(#${id}-glass)`}>
            <path d={jarPath} fill={tint} opacity={0.07} />
            <motion.rect
              x={JAR.left}
              width={JAR.right - JAR.left}
              initial={false}
              animate={{
                y: JAR.bottom - level * (JAR.bottom - JAR.mouth),
                height: level * (JAR.bottom - JAR.mouth) + 4,
              }}
              transition={{ type: 'spring', stiffness: 60, damping: 18 }}
              fill={tint}
              opacity={0.26}
            />
            {moving ? (
              <motion.path
                d={`M${JAR.cx} ${JAR.bottom - 46} m-30 0 a30 18 0 1 0 60 0 a22 13 0 1 0 -44 0 a14 8 0 1 0 28 0`}
                fill="none"
                stroke={tint}
                strokeWidth={2}
                strokeLinecap="round"
                opacity={0.5}
                style={{
                  originX: `${JAR.cx}px`,
                  originY: `${JAR.bottom - 46}px`,
                  transformBox: 'view-box',
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
              />
            ) : null}
            {/* Pages already in, swirling round the spoon */}
            <motion.g
              style={{
                originX: `${JAR.cx}px`,
                originY: `${JAR.bottom - 44}px`,
                transformBox: 'view-box',
              }}
              animate={moving ? { rotate: 360 } : { rotate: 0 }}
              transition={
                moving ? { duration: 5, repeat: Infinity, ease: 'linear' } : { duration: 0 }
              }
            >
              {Array.from({ length: inJar }, (_, i) => {
                const a = (i / SLOTS) * Math.PI * 2;
                const r = 16 + (i % 2) * 12;
                return (
                  <motion.g
                    key={i}
                    initial={still ? false : { y: -60, opacity: 0 }}
                    animate={{ y: 0, opacity: finished ? 0 : 1 }}
                    transition={{ type: 'spring', stiffness: 160, damping: 14 }}
                  >
                    <Page
                      x={JAR.cx + Math.cos(a) * r - PAGE.w / 2}
                      y={JAR.bottom - 44 + Math.sin(a) * r * 0.5 - PAGE.h / 2}
                      rotate={i * 47}
                      href={thumb(i)}
                      accent={accent}
                      clip={`${id}-p${i}`}
                    />
                  </motion.g>
                );
              })}
            </motion.g>
            {moving
              ? [0, 1, 2, 3, 4].map((i) => (
                  <motion.circle
                    key={i}
                    cx={JAR.left + 18 + i * 17}
                    r={1.6 + (i % 3) * 0.8}
                    fill="none"
                    stroke="#fff"
                    strokeOpacity={0.7}
                    strokeWidth={0.9}
                    animate={{ cy: [JAR.bottom - 4, JAR.mouth + 30], opacity: [0, 1, 0] }}
                    transition={{
                      duration: 1.6 + (i % 2) * 0.5,
                      delay: i * 0.35,
                      repeat: Infinity,
                      ease: 'easeIn',
                    }}
                  />
                ))
              : null}
          </g>

          {/* The giant spoon, ridden by a helper who stirs */}
          <motion.g
            style={{
              originX: `${JAR.cx}px`,
              originY: `${JAR.mouth + 4}px`,
              transformBox: 'view-box',
            }}
            animate={moving ? { rotate: [-9, 9, -9] } : { rotate: 0, opacity: finished ? 0 : 1 }}
            transition={
              moving ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }
            }
          >
            <ellipse cx={JAR.cx - 6} cy={JAR.bottom - 26} rx={11} ry={6} fill="#c79a6b" />
            <path
              d={`M${JAR.cx - 6} ${JAR.bottom - 30} L${JAR.cx + 11} ${JAR.mouth - 20}`}
              stroke="#b4855a"
              strokeWidth={5}
              strokeLinecap="round"
            />
            <Helper x={JAR.cx + 12} y={JAR.mouth - 23} color="sky" sitting />
          </motion.g>

          {/* Glass on top: outline, lip and shine */}
          <path d={jarPath} fill={`url(#${id}-shine)`} />
          <path d={jarPath} fill="none" stroke="var(--line-strong)" strokeWidth={1.6} />
          <rect
            x={JAR.cx - 26}
            y={JAR.mouth - 6}
            width={52}
            height={8}
            rx={3}
            fill="rgb(255 255 255 / 0.12)"
            stroke="var(--line-strong)"
            strokeWidth={1.4}
          />
          <path
            d={`M${JAR.left + 9} ${JAR.mouth + 36} L${JAR.left + 9} ${JAR.bottom - 22}`}
            stroke="#fff"
            strokeOpacity={0.45}
            strokeWidth={3}
            strokeLinecap="round"
          />
        </motion.g>

        {/* Pip tosses a page from its paw into the jar, over and over */}
        {moving ? (
          <Toss
            from={PAW}
            delay={0.4}
            href={thumb(0)}
            accent={accent}
            clip={`${id}-tp`}
            duration={1.8}
          />
        ) : null}

        {/* Helpers march in with a page each, then throw it in */}
        {HELPERS.map((h, i) => (
          <motion.g
            key={h.color}
            initial={still ? false : { x: 70, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 90, damping: 15, delay: 0.2 + h.delay * 0.4 }}
          >
            <Helper x={h.x} y={GROUND - 18} color={h.color} hopping={!still} delay={h.delay} />
            {moving ? (
              <Toss
                from={{ x: h.x, y: GROUND - 26 }}
                delay={1 + h.delay}
                href={thumb(i + 1)}
                accent={accent}
                clip={`${id}-th${i}`}
                duration={2.1}
              />
            ) : null}
          </motion.g>
        ))}

        {/* Finale: one bound document pops out of the jar */}
        {finished ? (
          <motion.g
            data-part="bound-document"
            initial={still ? false : { y: 40, scale: 0.4, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 11, delay: still ? 0 : 0.45 }}
            style={{ originX: `${JAR.cx}px`, originY: `${JAR.mouth}px`, transformBox: 'view-box' }}
          >
            <rect
              x={JAR.cx - 17}
              y={JAR.mouth - 52}
              width={34}
              height={44}
              rx={3}
              fill="#fbf9ff"
              stroke="var(--line-strong)"
            />
            {thumb(0) ? (
              <>
                <clipPath id={`${id}-cover`}>
                  <rect x={JAR.cx - 13} y={JAR.mouth - 48} width={28} height={36} rx={1.5} />
                </clipPath>
                <image
                  href={thumb(0)}
                  x={JAR.cx - 13}
                  y={JAR.mouth - 48}
                  width={28}
                  height={36}
                  preserveAspectRatio="xMidYMin slice"
                  clipPath={`url(#${id}-cover)`}
                />
              </>
            ) : (
              [0, 1, 2, 3].map((l) => (
                <rect
                  key={l}
                  x={JAR.cx - 10}
                  y={JAR.mouth - 44 + l * 7}
                  width={l === 3 ? 14 : 22}
                  height={2.5}
                  rx={1}
                  fill="#d6cfe8"
                />
              ))
            )}
            <rect x={JAR.cx - 17} y={JAR.mouth - 52} width={5} height={44} rx={2} fill={tint} />
            {[0, 1, 2, 3].map((s) => (
              <circle
                key={s}
                cx={JAR.cx - 14.5}
                cy={JAR.mouth - 46 + s * 11}
                r={1.1}
                fill="#fbf9ff"
              />
            ))}
          </motion.g>
        ) : null}
        {finished && !still
          ? [
              [-34, -60],
              [32, -66],
              [-26, -24],
              [38, -30],
              [0, -82],
            ].map(([dx, dy], i) => (
              <motion.path
                key={i}
                d="M0 -5 L1.3 -1.3 L5 0 L1.3 1.3 L0 5 L-1.3 1.3 L-5 0 L-1.3 -1.3 Z"
                fill={i % 2 ? 'var(--sunshine)' : tint}
                initial={{ x: JAR.cx, y: JAR.mouth - 24, scale: 0, opacity: 0 }}
                animate={{
                  x: JAR.cx + (dx ?? 0),
                  y: JAR.mouth + (dy ?? 0),
                  scale: [0, 1.3, 0.9],
                  opacity: [0, 1, 0.9],
                  rotate: 90,
                }}
                transition={{ duration: 0.7, delay: 0.55 + i * 0.05, ease: 'easeOut' }}
              />
            ))
          : null}
      </svg>
    </div>
  );
}

/** A small page: the user's first page when we have it, ruled paper otherwise. */
function Page({
  x,
  y,
  rotate = 0,
  href,
  accent,
  clip,
}: {
  x: number;
  y: number;
  rotate?: number;
  href?: string;
  accent: Accent;
  clip: string;
}) {
  const cx = x + PAGE.w / 2;
  const cy = y + PAGE.h / 2;
  return (
    <g transform={`rotate(${rotate} ${cx} ${cy})`}>
      <rect
        x={x}
        y={y}
        width={PAGE.w}
        height={PAGE.h}
        rx={1.5}
        fill="#fbf9ff"
        stroke={`color-mix(in srgb, var(--${accent}) 60%, #1b1033)`}
        strokeWidth={0.7}
      />
      {href ? (
        <>
          <clipPath id={clip}>
            <rect x={x + 1} y={y + 1} width={PAGE.w - 2} height={PAGE.h - 2} rx={1} />
          </clipPath>
          <image
            href={href}
            x={x + 1}
            y={y + 1}
            width={PAGE.w - 2}
            height={PAGE.h - 2}
            preserveAspectRatio="xMidYMin slice"
            clipPath={`url(#${clip})`}
          />
        </>
      ) : (
        [0, 1, 2].map((l) => (
          <rect
            key={l}
            x={x + 2.5}
            y={y + 3.5 + l * 3.6}
            width={l === 2 ? 5 : 8}
            height={1.4}
            rx={0.7}
            fill={`color-mix(in srgb, var(--${accent}) 35%, #d6cfe8)`}
          />
        ))
      )}
    </g>
  );
}

/** A page thrown in an arc from `from` into the mouth of the jar, on a loop. */
function Toss({
  from,
  delay,
  duration,
  href,
  accent,
  clip,
}: {
  from: { x: number; y: number };
  delay: number;
  duration: number;
  href?: string;
  accent: Accent;
  clip: string;
}) {
  const to = { x: JAR.cx - PAGE.w / 2, y: JAR.mouth + 6 };
  const peak = Math.min(from.y, to.y) - 34;
  const mid = (from.x + to.x) / 2;
  return (
    <motion.g
      data-part="flying-page"
      initial={{ x: from.x - PAGE.w / 2, y: from.y - PAGE.h, opacity: 0 }}
      animate={{
        x: [from.x - PAGE.w / 2, from.x - PAGE.w / 2, mid, to.x, to.x],
        y: [from.y - PAGE.h, from.y - PAGE.h, peak, to.y, to.y + 20],
        rotate: [0, 0, 160, 300, 340],
        opacity: [0, 1, 1, 1, 0],
      }}
      transition={{
        duration,
        delay,
        times: [0, 0.2, 0.55, 0.85, 1],
        ease: ['linear', 'easeOut', 'easeIn', 'linear'],
        repeat: Infinity,
        repeatDelay: 0.3,
      }}
    >
      <Page x={0} y={0} href={href} accent={accent} clip={clip} />
    </motion.g>
  );
}

/** One of Pip's paper helpers: a folded paper bird-blob with dot eyes and tiny feet. */
function Helper({
  x,
  y,
  color,
  sitting = false,
  hopping = false,
  delay = 0,
}: {
  x: number;
  y: number;
  color: Accent;
  sitting?: boolean;
  hopping?: boolean;
  delay?: number;
}) {
  const base = `var(--${color})`;
  const light = `color-mix(in srgb, var(--${color}) 65%, white)`;
  const shade = `color-mix(in srgb, var(--${color}) 70%, #1b1033)`;
  return (
    <motion.g
      data-part="helper"
      animate={hopping ? { y: [0, -4, 0, 0] } : undefined}
      transition={
        hopping ? { duration: 0.7, times: [0, 0.3, 0.6, 1], repeat: Infinity, delay } : undefined
      }
    >
      <g transform={`translate(${x} ${y}) scale(1.3)`}>
        {!sitting && (
          <path
            d="M-3 12 L-3 15 M3 12 L3 15"
            stroke="#3a3352"
            strokeWidth={1.3}
            strokeLinecap="round"
          />
        )}
        {/* Folded body: a lit front facet and a shaded back facet */}
        <path d="M-8 12 L0 -2 L8 12 Z" fill={base} />
        <path d="M0 -2 L8 12 L2 12 Z" fill={shade} />
        <path d="M0 -2 L-8 12 L-4 12 Z" fill={light} />
        {/* Folded paper ears */}
        <path d="M-3 1 L-5 -5 L-0.5 -1 Z" fill={shade} />
        <path d="M3 1 L5 -5 L0.5 -1 Z" fill={base} />
        <circle cx={-2} cy={5} r={1} fill="#1b1633" />
        <circle cx={2.4} cy={5} r={1} fill="#1b1633" />
        {sitting && (
          <path
            d="M-6 12 Q-9 15 -6 16 M6 12 Q9 15 6 16"
            stroke={shade}
            strokeWidth={1.4}
            fill="none"
            strokeLinecap="round"
          />
        )}
      </g>
    </motion.g>
  );
}
