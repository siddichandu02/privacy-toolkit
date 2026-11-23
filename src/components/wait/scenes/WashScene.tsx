import { motion } from 'framer-motion';
import { useId } from 'react';
import { useStillMotion } from '../../../useStillMotion';
import { Pip } from '../../pip/Pip';
import type { Accent } from '../../ui/accent';
import { Helper } from './Helper';
import { Sparkles } from './Sparkles';
import { With3DHelpers } from './With3DHelpers';

export interface WashSceneProps {
  /** Overall progress, 0 to 1. The lights round the door fill with it. */
  progress: number;
  accent?: Accent;
  /** The user's own photo, tumbling in the drum. */
  thumb?: string;
  /** The format it comes out as, shown on the machine and the tag: "JPG". */
  label?: string;
  className?: string;
}

const W = 300;
const H = 180;
const INK = '#1b1633';
const FLOOR_Y = 162;
/** Front-loading machine. */
const BOX = { x: 112, y: 70, w: 86, h: 90 };
const PANEL_H = 17;
const DOOR = { cx: BOX.x + BOX.w / 2, cy: 124, r: 27, glass: 20 };
/** The door swings open on a hinge on the right; the handle is on the left. */
const HINGE_X = DOOR.cx + DOOR.r + 2;
const LIGHTS = 12;
/** Washing line on two posts, right of the machine. */
const LINE = { x1: 214, x2: 288, y: 52, sag: 7 };
const PEG_X = (LINE.x1 + LINE.x2) / 2;
/** Where the clean photo hangs, relative to the door's centre. */
const HANG = { dx: PEG_X - DOOR.cx, dy: LINE.y + LINE.sag - 2 - DOOR.cy };
const PHOTO = { w: 24, h: 18 };

/** Pip is drawn 160 x 180; its holding paw reaches (142, 117) in that drawing. */
const PIP_H = 0.62 * H;
const PIP_W = (PIP_H * 160) / 180;
const PIP_LEFT = DOOR.cx - DOOR.r - 1 - (142 / 160) * PIP_W;
const PIP_TOP = FLOOR_Y - PIP_H;

/** Helper sitting on the lid, riding the spin. */
const HELPER = { x: BOX.x + BOX.w - 18, y: BOX.y - 19 };

/**
 * Convert story in three acts. Intro: the photo is tossed through the open
 * door and Pip holds it shut. Action: the drum tumbles the photo in suds
 * whose colour drifts, the machine shimmies, a paper helper rides the lid,
 * and the ring of lights round the door fills with real progress. Finale:
 * the door swings open, the photo sails out onto the washing line in a fresh
 * frame with a tag naming its new format, sparkles pop and Pip cheers. With
 * reduced motion nothing spins or shakes.
 */
export function WashScene({
  progress,
  accent = 'sky',
  thumb,
  label = 'JPG',
  className = '',
}: WashSceneProps) {
  const still = useStillMotion();
  const id = useId().replace(/:/g, '');
  const p = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  const done = p >= 1;
  const lit = Math.round(p * LIGHTS);
  const spinning = !still && !done;
  const pip = accent === 'violet' ? 'coral' : 'violet';
  const body = '#eeeaf8';
  const bodyShade = '#cdc6e4';
  const tone = `var(--${accent})`;
  // Suds drift from a soapy blue through to the tool colour as the wash goes on.
  const water = `color-mix(in srgb, ${tone} ${Math.round(25 + 55 * p)}%, #5b6ee1)`;

  return (
    <div
      className={`relative h-full ${className}`}
      style={{ aspectRatio: `${W} / ${H}` }}
      data-testid="wash-scene"
      data-lit={lit}
      data-act={done ? 'finale' : 'washing'}
    >
      <With3DHelpers width={W} height={H}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
          overflow="visible"
        >
          <defs>
            <clipPath id={`${id}-glass`}>
              <circle cx={DOOR.cx} cy={DOOR.cy} r={DOOR.glass} />
            </clipPath>
            <clipPath id={`${id}-photo`}>
              <rect
                x={-PHOTO.w / 2 + 2}
                y={-PHOTO.h / 2 + 2}
                width={PHOTO.w - 4}
                height={PHOTO.h - 4}
                rx={1}
              />
            </clipPath>
          </defs>

          {/* Floor */}
          <rect x={BOX.x - 70} y={FLOOR_Y} width={250} height={7} rx={3} fill="#4b4466" />
          <rect x={BOX.x - 70} y={FLOOR_Y} width={250} height={2.4} rx={1.2} fill="#6c6590" />

          {/* Washing line: two posts and a sagging cord. */}
          <g data-part="line">
            <rect
              x={LINE.x1 - 2}
              y={LINE.y - 4}
              width={4}
              height={FLOOR_Y - LINE.y + 4}
              rx={2}
              fill="#6c6590"
            />
            <rect
              x={LINE.x2 - 2}
              y={LINE.y - 4}
              width={4}
              height={FLOOR_Y - LINE.y + 4}
              rx={2}
              fill="#6c6590"
            />
            <path
              d={`M${LINE.x1} ${LINE.y} Q${PEG_X} ${LINE.y + LINE.sag * 2} ${LINE.x2} ${LINE.y}`}
              stroke="#a39cc2"
              strokeWidth={1}
              fill="none"
            />
            {/* A sock already drying, so the line reads as a washing line. */}
            <g transform={`translate(${LINE.x1 + 12} ${LINE.y + 4}) rotate(-6)`}>
              <path d="M-3 0 h6 v9 q0 3 4 4 v4 h-6 q-4 -1 -4 -6 z" fill="var(--sunshine)" />
              <path d="M-3 2.5 h6" stroke={INK} strokeWidth={0.8} opacity={0.4} />
              <rect
                x={-1}
                y={-2.5}
                width={2}
                height={4}
                rx={0.6}
                fill="#e8e4f5"
                stroke={INK}
                strokeWidth={0.4}
              />
            </g>
          </g>

          <ellipse cx={DOOR.cx} cy={FLOOR_Y} rx={50} ry={3} fill={INK} opacity={0.25} />

          {/* The machine shimmies while it spins. */}
          <motion.g
            data-part="machine"
            data-shaking={spinning}
            animate={spinning ? { x: [0, -0.9, 0.9, -0.5, 0] } : { x: 0 }}
            transition={spinning ? { duration: 0.32, repeat: Infinity } : { duration: 0.2 }}
          >
            {/* Feet */}
            <rect x={BOX.x + 6} y={BOX.y + BOX.h - 1} width={9} height={3} rx={1} fill={INK} />
            <rect
              x={BOX.x + BOX.w - 15}
              y={BOX.y + BOX.h - 1}
              width={9}
              height={3}
              rx={1}
              fill={INK}
            />
            {/* Cabinet with a shaded right side, folded-paper style. */}
            <rect x={BOX.x} y={BOX.y} width={BOX.w} height={BOX.h} rx={7} fill={body} />
            <path
              d={`M${BOX.x + BOX.w - 12} ${BOX.y} h5 q7 0 7 7 v${BOX.h - 14} q0 7 -7 7 h-5 z`}
              fill={bodyShade}
            />
            <line
              x1={BOX.x + 4}
              x2={BOX.x + BOX.w - 4}
              y1={BOX.y + PANEL_H}
              y2={BOX.y + PANEL_H}
              stroke={bodyShade}
              strokeWidth={1.2}
            />

            {/* Control panel: a little screen with the new format, two lights and a dial. */}
            <rect x={BOX.x + 8} y={BOX.y + 4} width={30} height={10} rx={2} fill={INK} />
            <text
              data-part="screen"
              x={BOX.x + 23}
              y={BOX.y + 11.6}
              textAnchor="middle"
              fontSize={7}
              fontWeight={700}
              fill={tone}
              fontFamily="inherit"
            >
              {label}
            </text>
            <circle
              cx={BOX.x + 46}
              cy={BOX.y + 9}
              r={1.8}
              fill={done ? 'var(--mint)' : '#b3acd0'}
            />
            <circle
              cx={BOX.x + 52}
              cy={BOX.y + 9}
              r={1.8}
              fill={done ? '#b3acd0' : 'var(--coral)'}
            />
            <motion.g
              style={{
                originX: `${BOX.x + 68}px`,
                originY: `${BOX.y + 9}px`,
                transformBox: 'view-box',
              }}
              initial={false}
              animate={{ rotate: p * 270 - 135 }}
              transition={still ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 16 }}
            >
              <circle cx={BOX.x + 68} cy={BOX.y + 9} r={5.5} fill="#fbf9ff" stroke={bodyShade} />
              <line
                x1={BOX.x + 68}
                y1={BOX.y + 9}
                x2={BOX.x + 68}
                y2={BOX.y + 5}
                stroke={INK}
                strokeWidth={1.4}
                strokeLinecap="round"
              />
            </motion.g>

            {/* Progress lights round the door, filling clockwise from the top. */}
            <g data-part="lights">
              {Array.from({ length: LIGHTS }, (_, i) => {
                const a = (i / LIGHTS) * Math.PI * 2 - Math.PI / 2;
                const r = DOOR.r + 4.5;
                return (
                  <circle
                    key={i}
                    data-on={i < lit}
                    cx={DOOR.cx + Math.cos(a) * r}
                    cy={DOOR.cy + Math.sin(a) * r}
                    r={1.3}
                    fill={i < lit ? tone : bodyShade}
                  />
                );
              })}
            </g>

            {/* Drum behind the glass: suds, bubbles and the tumbling photo. */}
            <circle cx={DOOR.cx} cy={DOOR.cy} r={DOOR.glass + 1} fill="#2a2347" />
            <g clipPath={`url(#${id}-glass)`}>
              <motion.rect
                data-part="water"
                x={DOOR.cx - DOOR.glass}
                width={DOOR.glass * 2}
                height={DOOR.glass * 2}
                initial={false}
                animate={{ y: done ? DOOR.cy + DOOR.glass : DOOR.cy - 4 }}
                transition={still ? { duration: 0 } : { duration: 0.6 }}
                style={{ fill: water }}
                opacity={0.85}
              />
              {!done ? (
                // The drum turns with an SVG animation: a CSS transform here would
                // lift the photo out of the round glass clip in Chrome.
                <g
                  data-part="drum"
                  transform={spinning ? undefined : `rotate(20 ${DOOR.cx} ${DOOR.cy})`}
                >
                  {spinning ? (
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from={`0 ${DOOR.cx} ${DOOR.cy}`}
                      to={`360 ${DOOR.cx} ${DOOR.cy}`}
                      dur="1.6s"
                      repeatCount="indefinite"
                    />
                  ) : null}
                  <motion.g
                    data-part="tumbling"
                    initial={still ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={still ? { duration: 0 } : { duration: 0.25, delay: 0.5 }}
                  >
                    <g transform={`translate(${DOOR.cx - 4} ${DOOR.cy + 6}) rotate(-18)`}>
                      <Snapshot thumb={thumb} clip={`${id}-photo`} frame="#fbf9ff" />
                    </g>
                  </motion.g>
                  {[
                    [8, -9, 2.4],
                    [-11, 3, 1.8],
                    [3, 12, 2],
                    [-6, -13, 1.4],
                  ].map(([dx, dy, r], i) => (
                    <circle
                      key={i}
                      cx={DOOR.cx + (dx as number)}
                      cy={DOOR.cy + (dy as number)}
                      r={r}
                      fill="#fbf9ff"
                      opacity={0.55}
                    />
                  ))}
                </g>
              ) : null}
            </g>

            {/* Intro: the photo is tossed in through the door. */}
            {!still && !done ? (
              <g transform={`translate(${DOOR.cx} ${DOOR.cy})`}>
                <motion.g
                  data-part="toss"
                  initial={{ x: -78, y: -30, rotate: -40, scale: 1.4, opacity: 1 }}
                  animate={{ x: 0, y: 4, rotate: 160, scale: 0.6, opacity: 0 }}
                  transition={{
                    duration: 0.7,
                    ease: 'easeIn',
                    opacity: { delay: 0.5, duration: 0.2 },
                  }}
                >
                  <Snapshot thumb={thumb} clip={`${id}-photo`} frame="#fbf9ff" />
                </motion.g>
              </g>
            ) : null}

            {/* The door: a chrome ring and glass, swinging open on its right hinge. */}
            <motion.g
              data-part="door"
              data-open={done}
              style={{ originX: `${HINGE_X}px`, originY: `${DOOR.cy}px`, transformBox: 'view-box' }}
              initial={false}
              animate={{ scaleX: done ? -0.35 : 1 }}
              transition={still ? { duration: 0 } : { type: 'spring', stiffness: 110, damping: 14 }}
            >
              <circle
                cx={DOOR.cx}
                cy={DOOR.cy}
                r={DOOR.glass + 3.5}
                fill="none"
                stroke="#a39cc2"
                strokeWidth={5}
              />
              <circle
                cx={DOOR.cx}
                cy={DOOR.cy}
                r={DOOR.glass + 3.5}
                fill="none"
                stroke="#fbf9ff"
                strokeWidth={1.2}
                opacity={0.7}
              />
              <path
                d={`M${DOOR.cx - 12} ${DOOR.cy - 10} a16 16 0 0 1 10 -6`}
                stroke="#fbf9ff"
                strokeWidth={2}
                strokeLinecap="round"
                fill="none"
                opacity={0.6}
              />
              {/* Handle, where Pip holds the door shut. */}
              <rect
                x={DOOR.cx - DOOR.glass - 7}
                y={DOOR.cy - 6}
                width={4}
                height={12}
                rx={2}
                fill="#8d86ad"
              />
            </motion.g>

            {/* The helper sits on the lid, bobbing with the spin. */}
            <Helper
              x={HELPER.x}
              y={HELPER.y}
              color={accent === 'mint' ? 'sunshine' : 'mint'}
              sitting={!done}
              hopping={!still}
              delay={0.1}
            />
          </motion.g>

          {/* Finale: the clean photo sails out and lands on the washing line. */}
          {done ? (
            <g transform={`translate(${DOOR.cx} ${DOOR.cy})`}>
              <motion.g
                data-part="hung"
                initial={still ? false : { x: 0, y: 0, rotate: -30, scale: 0.6, opacity: 0.4 }}
                animate={
                  still
                    ? { x: HANG.dx, y: HANG.dy, rotate: 0, scale: 1, opacity: 1 }
                    : {
                        x: [0, HANG.dx * 0.55, HANG.dx],
                        y: [0, HANG.dy - 34, HANG.dy],
                        rotate: [-30, 200, 360],
                        scale: [0.6, 1.15, 1],
                        opacity: 1,
                      }
                }
                transition={
                  still ? { duration: 0 } : { duration: 0.9, ease: 'easeOut', delay: 0.2 }
                }
              >
                <g transform={`translate(0 ${PHOTO.h / 2})`}>
                  <Snapshot thumb={thumb} clip={`${id}-photo`} frame={tone} />
                  {/* Two pegs and a tag naming the new format. */}
                  <rect
                    x={-8}
                    y={-PHOTO.h / 2 - 3}
                    width={2.4}
                    height={6}
                    rx={0.8}
                    fill="var(--sunshine)"
                    stroke={INK}
                    strokeWidth={0.4}
                  />
                  <rect
                    x={5.6}
                    y={-PHOTO.h / 2 - 3}
                    width={2.4}
                    height={6}
                    rx={0.8}
                    fill="var(--sunshine)"
                    stroke={INK}
                    strokeWidth={0.4}
                  />
                  <g
                    data-part="tag"
                    transform={`translate(${PHOTO.w / 2 - 2} ${PHOTO.h / 2 - 3}) rotate(-10)`}
                  >
                    <line x1={-3} y1={-3} x2={0} y2={0} stroke={INK} strokeWidth={0.6} />
                    <rect
                      x={0}
                      y={-1}
                      width={17}
                      height={8}
                      rx={1.6}
                      fill="#fbf9ff"
                      stroke={INK}
                      strokeWidth={0.5}
                    />
                    <text
                      x={8.5}
                      y={5.1}
                      textAnchor="middle"
                      fontSize={5.4}
                      fontWeight={800}
                      fill={INK}
                      fontFamily="inherit"
                    >
                      {label}
                    </text>
                  </g>
                </g>
              </motion.g>
            </g>
          ) : null}

          {done ? (
            <Sparkles
              still={still}
              delay={1}
              points={[
                { x: PEG_X - 20, y: LINE.y + 6 },
                { x: PEG_X + 22, y: LINE.y + 26, s: 0.7 },
                { x: DOOR.cx, y: BOX.y - 10, s: 0.8 },
              ]}
            />
          ) : null}
        </svg>

        {/* Pip holds the door shut through the wash, then cheers. */}
        <motion.div
          className="absolute"
          style={{
            left: `${(PIP_LEFT / W) * 100}%`,
            top: `${(PIP_TOP / H) * 100}%`,
            width: `${(PIP_W / W) * 100}%`,
            height: `${(PIP_H / H) * 100}%`,
          }}
          animate={spinning ? { x: [0, -0.8, 0.8, 0] } : { x: done ? -10 : 0 }}
          transition={
            spinning
              ? { duration: 0.32, repeat: Infinity }
              : { type: 'spring', stiffness: 140, damping: 16 }
          }
          data-part="pip"
        >
          <Pip pose={done ? 'celebrate' : 'hold'} accent={pip} className="h-full w-full" />
        </motion.div>
      </With3DHelpers>
    </div>
  );
}

/** A small framed photo centred on 0,0: the user's own picture or a sunny placeholder. */
function Snapshot({ thumb, clip, frame }: { thumb?: string; clip: string; frame: string }) {
  const x = -PHOTO.w / 2;
  const y = -PHOTO.h / 2;
  return (
    <g data-part="snapshot">
      <rect
        x={x}
        y={y}
        width={PHOTO.w}
        height={PHOTO.h}
        rx={1.8}
        style={{ fill: frame }}
        stroke={INK}
        strokeWidth={0.4}
      />
      {thumb ? (
        <image
          data-part="snapshot-photo"
          href={thumb}
          x={x + 2}
          y={y + 2}
          width={PHOTO.w - 4}
          height={PHOTO.h - 4}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clip})`}
        />
      ) : (
        <g clipPath={`url(#${clip})`}>
          <rect x={x + 2} y={y + 2} width={PHOTO.w - 4} height={PHOTO.h - 4} fill="var(--sky)" />
          <circle cx={x + 17} cy={y + 6} r={2.4} fill="var(--sunshine)" />
          <path d={`M${x + 2} ${y + 16} l6 -6 l4 3 l5 -5 l5 8 z`} fill="var(--mint)" />
        </g>
      )}
    </g>
  );
}
