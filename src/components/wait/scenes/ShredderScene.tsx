import { motion } from 'framer-motion';
import { useId } from 'react';
import { useStillMotion } from '../../../useStillMotion';
import { Pip } from '../../pip/Pip';
import type { Accent } from '../../ui/accent';
import { Helper } from './Helper';
import { Sparkles } from './Sparkles';
import { With3DHelpers } from './With3DHelpers';

export interface ShredderSceneProps {
  /** Overall progress, 0 to 1. Each tag is shredded as progress passes its mark. */
  progress: number;
  accent?: Accent;
  /** The user's own photo, on the easel. */
  thumb?: string;
  className?: string;
}

const W = 300;
const H = 180;
const INK = '#1b1633';
const FLOOR_Y = 162;
/** Paper shredder: a head with the slot on top, a see-through bin below. */
const HEAD = { x: 150, y: 100, w: 70, h: 18 };
const SLOT = { x: HEAD.x + 10, w: HEAD.w - 20, cx: HEAD.x + HEAD.w / 2 };
const BIN = { x: HEAD.x + 4, y: HEAD.y + HEAD.h, w: HEAD.w - 8, h: FLOOR_Y - HEAD.y - HEAD.h };
/** The photo on a little easel, right of the shredder. */
const PHOTO = { x: 238, y: 86, w: 46, h: 34 };

/** Pip is drawn 160 x 180; its holding paw reaches (142, 117) in that drawing. */
const PIP_H = 0.62 * H;
const PIP_W = (PIP_H * 160) / 180;
/** Pip's paw sits just above the left of the slot. */
const PAW = { x: SLOT.x + 6, y: HEAD.y - 10 };
const PIP_LEFT = PAW.x - (142 / 160) * PIP_W;
const PIP_TOP = PAW.y - (117 / 180) * PIP_H;
/** Pip stands on a crate to reach the slot. */
const CRATE = { x: PIP_LEFT + PIP_W * 0.18, y: PIP_TOP + PIP_H - 3, w: PIP_W * 0.6 };

/** The tags, in the order they are shredded; Pip holds the location tag till last. */
type TagKind = 'date' | 'camera' | 'location';
const TAGS: readonly { kind: TagKind; color: string; mark: number }[] = [
  { kind: 'date', color: 'var(--sunshine)', mark: 0.3 },
  { kind: 'camera', color: 'var(--sky)', mark: 0.58 },
  { kind: 'location', color: 'var(--coral)', mark: 0.86 },
];
/** Where each photo tag hangs from, on the photo's lower edge. */
const HANG: Record<'date' | 'camera', { x: number; y: number }> = {
  date: { x: PHOTO.x + 10, y: PHOTO.y + PHOTO.h },
  camera: { x: PHOTO.x + PHOTO.w - 10, y: PHOTO.y + PHOTO.h },
};
/** Paper strips that land in the bin for each shredded tag. */
const STRIPS = 7;

/**
 * Remove EXIF story in three acts. Intro: the photo sits on an easel with
 * little luggage tags hanging off it (date, camera) and Pip, up on a crate,
 * dangles the location tag over the shredder. Action: as real progress passes
 * each tag's mark, the tag unhooks, sails over and is fed into the slot; the
 * shredder buzzes, strips in the tag's colour pile up in the see-through bin
 * and the little screen counts down the details left. Finale: Pip lets go of
 * the location tag last, puts on sunglasses and cheers while the clean photo
 * sparkles. With reduced motion nothing flies or shakes.
 */
export function ShredderScene({
  progress,
  accent = 'violet',
  thumb,
  className = '',
}: ShredderSceneProps) {
  const still = useStillMotion();
  const id = useId().replace(/:/g, '');
  const p = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  const done = p >= 1;
  const shredded = TAGS.filter((t) => p >= t.mark || done).length;
  const left = TAGS.length - shredded;
  const pip = accent === 'coral' ? 'violet' : accent;
  const tone = `var(--${accent})`;
  const buzzing = !still && !done && shredded > 0;
  const body = '#eeeaf8';
  const shade = '#cdc6e4';

  return (
    <div
      className={`relative h-full ${className}`}
      style={{ aspectRatio: `${W} / ${H}` }}
      data-testid="shredder-scene"
      data-shredded={shredded}
      data-act={done ? 'finale' : shredded ? 'shredding' : 'intro'}
    >
      <With3DHelpers width={W} height={H}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
          overflow="visible"
        >
          <defs>
            <clipPath id={`${id}-bin`}>
              <rect x={BIN.x + 3} y={BIN.y + 3} width={BIN.w - 6} height={BIN.h - 6} rx={3} />
            </clipPath>
            <clipPath id={`${id}-photo`}>
              <rect
                x={PHOTO.x + 2.5}
                y={PHOTO.y + 2.5}
                width={PHOTO.w - 5}
                height={PHOTO.h - 5}
                rx={1}
              />
            </clipPath>
          </defs>

          {/* Floor */}
          <rect x={20} y={FLOOR_Y} width={270} height={7} rx={3} fill="#4b4466" />
          <rect x={20} y={FLOOR_Y} width={270} height={2.4} rx={1.2} fill="#6c6590" />
          <ellipse cx={HEAD.x + HEAD.w / 2} cy={FLOOR_Y} rx={42} ry={3} fill={INK} opacity={0.25} />

          {/* The crate Pip stands on. */}
          <g data-part="crate">
            <rect
              x={CRATE.x}
              y={CRATE.y}
              width={CRATE.w}
              height={FLOOR_Y - CRATE.y}
              rx={2}
              fill="#c9a26b"
            />
            <path
              d={`M${CRATE.x} ${CRATE.y} L${CRATE.x + CRATE.w} ${FLOOR_Y} M${CRATE.x + CRATE.w} ${CRATE.y} L${CRATE.x} ${FLOOR_Y}`}
              stroke="#a07c49"
              strokeWidth={2}
            />
            <rect
              x={CRATE.x}
              y={CRATE.y}
              width={CRATE.w}
              height={FLOOR_Y - CRATE.y}
              rx={2}
              fill="none"
              stroke="#a07c49"
              strokeWidth={2}
            />
          </g>

          {/* Easel and the photo. */}
          <g data-part="easel">
            <path
              d={`M${PHOTO.x + 8} ${FLOOR_Y} L${PHOTO.x + PHOTO.w / 2} ${PHOTO.y - 6} L${PHOTO.x + PHOTO.w - 8} ${FLOOR_Y}`}
              stroke="#8d86ad"
              strokeWidth={2.4}
              strokeLinecap="round"
              fill="none"
            />
            <rect
              x={PHOTO.x - 3}
              y={PHOTO.y + PHOTO.h - 1}
              width={PHOTO.w + 6}
              height={3}
              rx={1.5}
              fill="#8d86ad"
            />
            <motion.rect
              data-part="photo-frame"
              x={PHOTO.x}
              y={PHOTO.y}
              width={PHOTO.w}
              height={PHOTO.h}
              rx={2}
              stroke={INK}
              strokeWidth={0.5}
              initial={false}
              animate={{ fill: done ? tone : '#fbf9ff' }}
              transition={still ? { duration: 0 } : { duration: 0.5, delay: 0.3 }}
            />
            {thumb ? (
              <image
                data-part="photo"
                href={thumb}
                x={PHOTO.x + 2.5}
                y={PHOTO.y + 2.5}
                width={PHOTO.w - 5}
                height={PHOTO.h - 5}
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#${id}-photo)`}
              />
            ) : (
              <g clipPath={`url(#${id}-photo)`}>
                <rect x={PHOTO.x} y={PHOTO.y} width={PHOTO.w} height={PHOTO.h} fill="#9ad8f0" />
                <circle cx={PHOTO.x + 34} cy={PHOTO.y + 10} r={5} fill="var(--sunshine)" />
                <path
                  d={`M${PHOTO.x} ${PHOTO.y + PHOTO.h} l14 -14 l9 8 l10 -12 l13 18 z`}
                  fill="var(--mint)"
                />
              </g>
            )}
          </g>

          {/* Shredded strips pile up in the bin, in the colours of the tags. */}
          <rect
            x={BIN.x}
            y={BIN.y}
            width={BIN.w}
            height={BIN.h}
            rx={5}
            fill="#2a2347"
            opacity={0.85}
          />
          <g data-part="strips" clipPath={`url(#${id}-bin)`}>
            {TAGS.slice(0, shredded).flatMap((t, ti) =>
              Array.from({ length: STRIPS }, (_, i) => {
                const x = BIN.x + 6 + ((i * 7 + ti * 3) % (BIN.w - 12));
                const restY = FLOOR_Y - 8 - ti * 7 - (i % 3) * 2;
                return (
                  <motion.rect
                    key={`${t.kind}-${i}`}
                    width={1.8}
                    height={9}
                    rx={0.6}
                    x={x}
                    style={{ fill: t.color }}
                    initial={still ? false : { y: BIN.y - 6, rotate: 0 }}
                    animate={{ y: restY, rotate: ((i * 37) % 60) - 30 }}
                    transition={
                      still
                        ? { duration: 0 }
                        : { duration: 0.7, delay: 0.45 + i * 0.05, ease: 'easeIn' }
                    }
                  />
                );
              }),
            )}
          </g>
          {/* Glass shine on the bin. */}
          <rect
            x={BIN.x}
            y={BIN.y}
            width={BIN.w}
            height={BIN.h}
            rx={5}
            fill="none"
            stroke={shade}
            strokeWidth={1.5}
          />
          <path
            d={`M${BIN.x + 7} ${BIN.y + 8} v${BIN.h - 20}`}
            stroke="#fbf9ff"
            strokeWidth={1.6}
            strokeLinecap="round"
            opacity={0.35}
          />

          {/* Photo tags: unhook and sail into the slot as their mark passes. */}
          {TAGS.filter((t) => t.kind !== 'location').map((t) => {
            const hang = HANG[t.kind as 'date' | 'camera'];
            const gone = p >= t.mark || done;
            return (
              <g key={t.kind} transform={`translate(${hang.x} ${hang.y})`}>
                <motion.g
                  data-part={`tag-${t.kind}`}
                  data-gone={gone}
                  initial={false}
                  animate={
                    gone
                      ? still
                        ? { opacity: 0 }
                        : {
                            x: [0, (SLOT.cx - hang.x) * 0.5, SLOT.cx - hang.x, SLOT.cx - hang.x],
                            y: [0, -46, HEAD.y - 22 - hang.y, HEAD.y + 4 - hang.y],
                            rotate: [0, -120, -180, -180],
                            opacity: [1, 1, 1, 0],
                          }
                      : { x: 0, y: 0, rotate: still ? 0 : [-6, 6, -6], opacity: 1 }
                  }
                  transition={
                    gone
                      ? still
                        ? { duration: 0.2 }
                        : { duration: 0.9, times: [0, 0.45, 0.8, 1], ease: 'easeInOut' }
                      : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
                  }
                >
                  <Tag kind={t.kind} color={t.color} />
                </motion.g>
              </g>
            );
          })}

          {/* The location tag, dangling from Pip's paw until last. */}
          <g transform={`translate(${PAW.x} ${PAW.y})`}>
            <motion.g
              data-part="tag-location"
              data-gone={shredded === TAGS.length}
              initial={false}
              animate={
                shredded === TAGS.length
                  ? still
                    ? { opacity: 0 }
                    : { x: [0, 6, 10], y: [0, 4, 24], rotate: [0, 0, 0], opacity: [1, 1, 0] }
                  : { x: 0, y: 0, rotate: still ? 0 : [-10, 10, -10], opacity: 1 }
              }
              transition={
                shredded === TAGS.length
                  ? { duration: still ? 0.2 : 0.6, ease: 'easeIn' }
                  : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
              }
            >
              <Tag kind="location" color="var(--coral)" />
            </motion.g>
          </g>

          {/* Shredder head, drawn over the tags so they vanish into the slot. */}
          <motion.g
            data-part="shredder"
            data-buzzing={buzzing}
            animate={buzzing ? { x: [0, -0.6, 0.6, 0] } : { x: 0 }}
            transition={buzzing ? { duration: 0.16, repeat: Infinity } : { duration: 0.2 }}
          >
            <rect x={HEAD.x} y={HEAD.y} width={HEAD.w} height={HEAD.h} rx={4} fill={body} />
            <path
              d={`M${HEAD.x + HEAD.w - 10} ${HEAD.y} h6 q4 0 4 4 v${HEAD.h - 8} q0 4 -4 4 h-6 z`}
              fill={shade}
            />
            {/* The slot, with its row of teeth. */}
            <rect x={SLOT.x} y={HEAD.y - 1.5} width={SLOT.w} height={4} rx={2} fill={INK} />
            {Array.from({ length: 9 }, (_, i) => (
              <rect
                key={i}
                x={SLOT.x + 3 + i * ((SLOT.w - 6) / 9)}
                y={HEAD.y + 0.4}
                width={2}
                height={1.4}
                fill="#8d86ad"
              />
            ))}
            {/* Screen: details left, then a tick. */}
            <rect x={HEAD.x + 8} y={HEAD.y + 6} width={16} height={9} rx={2} fill={INK} />
            <text
              data-part="screen"
              data-left={left}
              x={HEAD.x + 16}
              y={HEAD.y + 13}
              textAnchor="middle"
              fontSize={7}
              fontWeight={800}
              fill={done ? 'var(--mint)' : 'var(--coral)'}
              fontFamily="inherit"
            >
              {done ? '✓' : left}
            </text>
            <circle
              cx={HEAD.x + 32}
              cy={HEAD.y + 10.5}
              r={2}
              fill={done ? 'var(--mint)' : buzzing ? 'var(--coral)' : '#b3acd0'}
            />
          </motion.g>

          {/* A paper helper sits on the shredder and bounces with the buzz. */}
          <Helper
            x={HEAD.x + HEAD.w - 14}
            y={HEAD.y - 19}
            color={accent === 'mint' ? 'sunshine' : 'mint'}
            sitting={!done}
            hopping={!still}
            delay={0.15}
          />

          {done ? (
            <Sparkles
              still={still}
              delay={0.5}
              points={[
                { x: PHOTO.x + 4, y: PHOTO.y - 6 },
                { x: PHOTO.x + PHOTO.w + 2, y: PHOTO.y + 8, s: 0.7 },
                { x: PAW.x - 40, y: PIP_TOP + 4, s: 0.8 },
              ]}
            />
          ) : null}
        </svg>

        {/* Pip dangles the location tag, then puts on sunglasses and cheers. */}
        <motion.div
          className="absolute"
          style={{
            left: `${(PIP_LEFT / W) * 100}%`,
            top: `${(PIP_TOP / H) * 100}%`,
            width: `${(PIP_W / W) * 100}%`,
            height: `${(PIP_H / H) * 100}%`,
          }}
          data-part="pip"
        >
          <Pip
            pose={done ? 'celebrate' : 'hold'}
            accent={pip}
            accessory={done ? 'sunglasses' : null}
            className="h-full w-full"
          />
        </motion.div>
      </With3DHelpers>
    </div>
  );
}

/** A luggage tag hanging from 0,0 on a short string, with an icon for what it holds. */
function Tag({ kind, color }: { kind: TagKind; color: string }) {
  return (
    <g data-tag={kind}>
      <line x1={0} y1={0} x2={0} y2={5} stroke={INK} strokeWidth={0.6} />
      <path d="M-7 8 L-4 5 H4 L7 8 V24 Q7 25 6 25 H-6 Q-7 25 -7 24 Z" style={{ fill: color }} />
      <path
        d="M-7 8 L-4 5 H4 L7 8 V24 Q7 25 6 25 H-6 Q-7 25 -7 24 Z"
        fill="none"
        stroke={INK}
        strokeWidth={0.5}
      />
      <circle cx={0} cy={8} r={1.1} fill="#fbf9ff" stroke={INK} strokeWidth={0.4} />
      <g transform="translate(0 17)" fill={INK}>
        {kind === 'location' ? (
          <>
            <path d="M0 -5 a3.4 3.4 0 0 1 3.4 3.4 c0 2.6 -3.4 6 -3.4 6 c0 0 -3.4 -3.4 -3.4 -6 a3.4 3.4 0 0 1 3.4 -3.4z" />
            <circle cx={0} cy={-1.6} r={1.2} style={{ fill: color }} />
          </>
        ) : kind === 'date' ? (
          <>
            <rect x={-4} y={-3.5} width={8} height={7.5} rx={1} />
            <rect x={-3} y={-1} width={6} height={4} rx={0.4} style={{ fill: color }} />
            <rect x={-2.6} y={-5} width={1.2} height={2.6} rx={0.4} />
            <rect x={1.4} y={-5} width={1.2} height={2.6} rx={0.4} />
          </>
        ) : (
          <>
            <rect x={-4.5} y={-3} width={9} height={6.5} rx={1.2} />
            <rect x={-1.8} y={-4.4} width={3.6} height={2} rx={0.5} />
            <circle cx={0} cy={0.3} r={2} style={{ fill: color }} />
          </>
        )}
      </g>
    </g>
  );
}
