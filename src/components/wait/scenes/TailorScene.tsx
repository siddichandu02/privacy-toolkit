import { motion } from 'framer-motion';
import { useId } from 'react';
import { useStillMotion } from '../../../useStillMotion';
import { Pip } from '../../pip/Pip';
import type { Accent } from '../../ui/accent';
import { Helper } from './Helper';
import { Sparkles } from './Sparkles';
import { alongPattern, PHOTO, patternBox, type Box } from './tailorPath';
import { With3DHelpers } from './With3DHelpers';

export interface TailorSceneProps {
  /** Overall progress, 0 to 1. The cut runs around the pattern as it grows. */
  progress: number;
  accent?: Accent;
  /** The user's photo. A drawn landscape when missing. */
  thumb?: string;
  /** Shape of the piece being cut, width / height. */
  aspect?: number;
  /** Written on the tag the finished piece gets, e.g. "1080 × 1350". */
  label?: string;
  className?: string;
}

const W = 300;
const H = 180;
const TABLE_Y = 150;

/** A small landscape so the scene still reads without the user's photo. */
function Landscape({ box, accent }: { box: Box; accent: Accent }) {
  const { x, y, w, h } = box;
  return (
    <>
      <rect x={x} y={y} width={w} height={h} fill={`color-mix(in srgb, var(--sky) 45%, #f4f1ff)`} />
      <circle
        cx={x + w * 0.72}
        cy={y + h * 0.3}
        r={h * 0.12}
        fill={`color-mix(in srgb, var(--${accent}) 85%, white)`}
      />
      <path
        d={`M${x} ${y + h * 0.78} Q${x + w * 0.28} ${y + h * 0.42} ${x + w * 0.55} ${y + h * 0.72} T${x + w} ${y + h * 0.6} V${y + h} H${x} Z`}
        fill={`color-mix(in srgb, var(--mint) 70%, #1b1033)`}
      />
      <path
        d={`M${x} ${y + h * 0.9} Q${x + w * 0.4} ${y + h * 0.66} ${x + w} ${y + h * 0.86} V${y + h} H${x} Z`}
        fill="var(--mint)"
      />
    </>
  );
}

function Photo({
  thumb,
  accent,
  clip,
}: {
  thumb?: string;
  accent: Accent;
  /** A clipPath id to draw through. */
  clip: string;
}) {
  const box = { x: PHOTO.x, y: PHOTO.y, w: PHOTO.w, h: PHOTO.h };
  return (
    <g clipPath={`url(#${clip})`}>
      {thumb ? (
        <image
          data-part="real-photo"
          href={thumb}
          x={box.x}
          y={box.y}
          width={box.w}
          height={box.h}
          preserveAspectRatio="xMidYMid slice"
        />
      ) : (
        <Landscape box={box} accent={accent} />
      )}
    </g>
  );
}

/** Tailor's shears drawn pointing right from the pivot at 0,0. Blades snip while `snipping`. */
function Shears({ snipping }: { snipping: boolean }) {
  const blade = (dir: 1 | -1) => (
    <motion.g
      style={{ originX: '0px', originY: '0px', transformBox: 'view-box' }}
      animate={snipping ? { rotate: [dir * 16, dir * 2, dir * 16] } : { rotate: dir * 8 }}
      transition={
        snipping ? { duration: 0.45, repeat: Infinity, ease: 'easeInOut' } : { duration: 0 }
      }
    >
      <path d={`M-2 ${dir * 1.2} L22 ${dir * 0.4} L22 0 L-2 0 Z`} fill="#e9ecf5" />
      <path d={`M-2 ${dir * 1.2} L22 ${dir * 0.4}`} stroke="#a9aec4" strokeWidth={0.6} />
      <path d={`M-2 0 L-9 ${dir * 6}`} stroke="#3a3352" strokeWidth={2.6} strokeLinecap="round" />
      <ellipse
        cx={-12}
        cy={dir * 8}
        rx={4.6}
        ry={3.4}
        fill="none"
        stroke="var(--coral)"
        strokeWidth={2.4}
      />
    </motion.g>
  );
  return (
    <g data-part="shears">
      {blade(-1)}
      {blade(1)}
      <circle r={1.6} fill="#3a3352" />
    </g>
  );
}

/**
 * Resize and crop story. Intro: the photo lies on a cutting mat with a dashed
 * pattern chalked on it, the shape of the size the person picked. Action:
 * Pip, as the tailor, guides giant shears round the pattern; the cut line
 * follows real progress and only the snipping loops. A paper helper holds
 * the tape measure. Finale: the offcuts drop away, the piece lifts off the
 * mat with a size tag hanging from it, and Pip cheers. With reduced motion
 * everything stands still.
 */
export function TailorScene({
  progress,
  accent = 'sunshine',
  thumb,
  aspect = 4 / 5,
  label,
  className = '',
}: TailorSceneProps) {
  const still = useStillMotion();
  const id = `tailor-${useId().replace(/:/g, '')}`;
  const p = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  const finished = p >= 1;
  const box = patternBox(aspect);
  const at = alongPattern(box, p);
  const pip = accent === 'coral' ? 'violet' : 'coral';
  const ink = `color-mix(in srgb, var(--${accent}) 70%, #1b1033)`;
  const ease = still ? { duration: 0 } : { type: 'spring' as const, stiffness: 170, damping: 18 };
  const outline = `M${box.x} ${box.y} H${box.x + box.w} V${box.y + box.h} H${box.x} Z`;
  const tagX = box.x + box.w - 4;
  const tagY = box.y + 2;

  return (
    <div
      className={`relative h-full ${className}`}
      style={{ aspectRatio: `${W} / ${H}` }}
      data-testid="tailor-scene"
      data-cut={Math.round(p * 100)}
      data-act={finished ? 'finale' : p > 0 ? 'action' : 'intro'}
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
          <defs>
            <clipPath id={`${id}-photo`}>
              <rect x={PHOTO.x} y={PHOTO.y} width={PHOTO.w} height={PHOTO.h} />
            </clipPath>
            <clipPath id={`${id}-piece`}>
              <rect x={box.x} y={box.y} width={box.w} height={box.h} />
            </clipPath>
          </defs>

          {/* Table and cutting mat */}
          <rect x={160} y={TABLE_Y} width={136} height={8} rx={3} fill="#4b4466" />
          <rect x={160} y={TABLE_Y} width={136} height={2.5} rx={1.2} fill="#6c6590" />
          <rect
            x={PHOTO.x - 8}
            y={PHOTO.y - 8}
            width={PHOTO.w + 16}
            height={TABLE_Y - PHOTO.y + 8}
            rx={4}
            fill="color-mix(in srgb, var(--mint) 40%, #1f3b3a)"
          />
          {Array.from({ length: Math.ceil((PHOTO.w + 16) / 16) - 1 }, (_, i) => (
            <line
              key={`v${i}`}
              x1={PHOTO.x - 8 + (i + 1) * 16}
              x2={PHOTO.x - 8 + (i + 1) * 16}
              y1={PHOTO.y - 8}
              y2={TABLE_Y}
              stroke="#ffffff"
              strokeOpacity={0.12}
              strokeWidth={0.5}
            />
          ))}
          {Array.from({ length: Math.ceil((TABLE_Y - PHOTO.y + 8) / 16) - 1 }, (_, i) => (
            <line
              key={`h${i}`}
              x1={PHOTO.x - 8}
              x2={PHOTO.x + PHOTO.w + 8}
              y1={PHOTO.y - 8 + (i + 1) * 16}
              y2={PHOTO.y - 8 + (i + 1) * 16}
              stroke="#ffffff"
              strokeOpacity={0.12}
              strokeWidth={0.5}
            />
          ))}

          {/* The photo. Once cut, the offcuts fade and drop a little. */}
          <motion.g
            data-part="offcut"
            animate={finished ? { opacity: 0.28, y: 4 } : { opacity: 1, y: 0 }}
            transition={still ? { duration: 0 } : { duration: 0.4 }}
          >
            <Photo thumb={thumb} accent={accent} clip={`${id}-photo`} />
            <rect
              x={PHOTO.x}
              y={PHOTO.y}
              width={PHOTO.w}
              height={PHOTO.h}
              fill="none"
              stroke="#ffffff"
              strokeOpacity={0.5}
              strokeWidth={1}
            />
          </motion.g>

          {/* The finished piece lifts off the mat with its tag. */}
          {finished ? (
            <motion.g
              data-part="piece"
              initial={still ? false : { y: 0, scale: 1 }}
              animate={{ y: -10, scale: 1.04 }}
              style={{
                originX: `${box.x + box.w / 2}px`,
                originY: `${box.y + box.h / 2}px`,
                transformBox: 'view-box',
              }}
              transition={ease}
            >
              <rect
                x={box.x + 2}
                y={box.y + 4}
                width={box.w}
                height={box.h}
                fill="#1b1033"
                opacity={0.25}
              />
              <Photo thumb={thumb} accent={accent} clip={`${id}-piece`} />
              <rect
                x={box.x}
                y={box.y}
                width={box.w}
                height={box.h}
                fill="none"
                stroke={`var(--${accent})`}
                strokeWidth={1.6}
              />
              {label ? (
                <motion.g
                  data-part="size-tag"
                  initial={still ? false : { rotate: -40, opacity: 0 }}
                  animate={{ rotate: [-40, 12, -6, 0], opacity: 1 }}
                  style={{ originX: `${tagX}px`, originY: `${tagY}px`, transformBox: 'view-box' }}
                  transition={still ? { duration: 0 } : { duration: 0.9, delay: 0.2 }}
                >
                  <path
                    d={`M${tagX} ${tagY} L${tagX + 6} ${tagY + 12}`}
                    stroke="#f5f5ff"
                    strokeWidth={0.8}
                  />
                  <g transform={`translate(${tagX + 6} ${tagY + 12}) rotate(14)`}>
                    <path
                      d="M0 0 L44 0 L48 6 L44 12 L0 12 Z"
                      fill="#fbf9ff"
                      stroke={ink}
                      strokeWidth={0.8}
                    />
                    <circle cx={43.5} cy={6} r={1.3} fill="none" stroke={ink} strokeWidth={0.7} />
                    <text
                      x={20.5}
                      y={8.3}
                      textAnchor="middle"
                      fontSize={5.8}
                      fontWeight={700}
                      fill={ink}
                      style={{ fontFamily: 'var(--font-display, inherit)' }}
                    >
                      {label}
                    </text>
                  </g>
                </motion.g>
              ) : null}
            </motion.g>
          ) : (
            <>
              {/* Chalked pattern, and the cut so far over it. */}
              <path
                d={outline}
                fill="none"
                stroke="#1b1033"
                strokeOpacity={0.35}
                strokeWidth={2.2}
                strokeDasharray="3 2.4"
              />
              <path
                d={outline}
                fill="none"
                stroke="#ffffff"
                strokeWidth={1}
                strokeDasharray="3 2.4"
              />
              <path
                d={outline}
                pathLength={1}
                fill="none"
                stroke="#1b1033"
                strokeOpacity={0.55}
                strokeWidth={3.4}
                strokeDasharray={`${p} 1`}
                strokeLinecap="round"
              />
              <path
                data-part="cut"
                d={outline}
                pathLength={1}
                fill="none"
                stroke="#ffffff"
                strokeWidth={1.8}
                strokeDasharray={`${p} 1`}
                strokeLinecap="round"
              />
            </>
          )}

          {/* Tape measure along the front of the table, held by the helper. */}
          <path
            d={`M180 ${TABLE_Y - 2} Q232 ${TABLE_Y + 10} 292 ${TABLE_Y + 3}`}
            fill="none"
            stroke="var(--sunshine)"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <path
            d={`M180 ${TABLE_Y - 2} Q232 ${TABLE_Y + 10} 292 ${TABLE_Y + 3}`}
            fill="none"
            stroke="#1b1033"
            strokeOpacity={0.45}
            strokeWidth={2.6}
            strokeDasharray="0.6 4"
          />
          <Helper
            x={172}
            y={TABLE_Y - 20}
            color={accent === 'sky' ? 'mint' : 'sky'}
            sitting={!finished}
            hopping={!still && finished}
          />

          {finished ? (
            <Sparkles
              still={still}
              points={[
                { x: box.x - 6, y: box.y - 8 },
                { x: box.x + box.w + 8, y: box.y + box.h - 4 },
                { x: box.x + box.w / 2, y: box.y - 18, s: 1.2 },
              ]}
            />
          ) : (
            <motion.g
              data-part="shears-at"
              data-snipping={!still}
              initial={false}
              style={{ originX: '0px', originY: '0px', transformBox: 'view-box' }}
              animate={{ x: at.x, y: at.y, rotate: at.angle }}
              transition={still ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 20 }}
            >
              <g transform="scale(1.5)">
                <Shears snipping={!still} />
              </g>
            </motion.g>
          )}
        </svg>
      </With3DHelpers>
    </div>
  );
}
