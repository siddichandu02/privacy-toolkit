import { animate, motion, useMotionValue, useTransform, type Transition } from 'framer-motion';
import { useEffect } from 'react';
import { useStillMotion } from '../../useStillMotion';

export type StoryStep = 0 | 1 | 2;

/*
 * A tiny desktop: two PDFs on the left, a browser window in the middle, the
 * servers off to the right behind a cut line, and a dock with a Downloads
 * folder at the bottom. Each step is its own layer so its moves replay from
 * the start whenever that step comes on stage.
 *
 * Window content area: x 78-368, y 44-208.
 */
const WIN = { x: 78, y: 18, w: 290, h: 190 };
const THUMB_A = { x: 160, y: 74 };
const THUMB_B = { x: 232, y: 74 };
const MERGED = { x: 196, y: 64 };
const FOLDER = { x: 262, y: 236 };

/** The mouse pointer, tip at 0,0. */
function Cursor() {
  return (
    <path
      d="M0 0v17l4.6-4.2 3.2 7.2 3-1.3-3.1-7h6.4Z"
      fill="#fff"
      stroke="#14142b"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
  );
}

/** A page thumbnail with a coloured heading bar and lines of text. */
function Page({ tone, w = 54, h = 70 }: { tone: string; w?: number; h?: number }) {
  return (
    <g>
      <rect
        width={w}
        height={h}
        rx="5"
        style={{ fill: 'var(--canvas-raised)' }}
        stroke="var(--line-strong)"
        strokeWidth="1.2"
      />
      <rect x="7" y="8" width={w * 0.45} height="5" rx="2.5" fill={`var(--${tone})`} />
      {[20, 28, 36, 44, 52].map((y, i) => (
        <rect
          key={y}
          x="7"
          y={y}
          width={i % 2 ? w - 22 : w - 14}
          height="3"
          rx="1.5"
          style={{ fill: 'var(--line-strong)' }}
        />
      ))}
    </g>
  );
}

/** A file icon as it sits on a desktop. */
function FileIcon({ tone }: { tone: string }) {
  return (
    <g>
      <path
        d="M0 0h22l10 10v32H0Z"
        style={{ fill: 'var(--canvas-raised)' }}
        stroke={`var(--${tone})`}
        strokeWidth="1.6"
      />
      <path d="M22 0v10h10" fill="none" stroke={`var(--${tone})`} strokeWidth="1.6" />
      <rect x="4" y="27" width="24" height="9" rx="2" fill={`var(--${tone})`} />
      <text x="16" y="34" textAnchor="middle" fontSize="6.5" fontWeight="800" fill="#fff">
        PDF
      </text>
    </g>
  );
}

/** Step 1: the pointer drags two PDFs off the desktop and drops them in the tab. */
function DropLayer({ t }: { t: (d: number, extra?: Transition) => Transition }) {
  const D = 2.6;
  const times = [0, 0.22, 0.32, 0.7, 0.78, 1];
  return (
    <g>
      {/* The drop target lights up while the files hover it. */}
      <motion.rect
        x="92"
        y="56"
        width="262"
        height="140"
        rx="10"
        fill="var(--violet)"
        stroke="var(--violet)"
        strokeWidth="2"
        initial={{ fillOpacity: 0, strokeOpacity: 0 }}
        animate={{ fillOpacity: [0, 0, 0.1, 0.1, 0], strokeOpacity: [0, 0, 1, 1, 0] }}
        transition={t(D, { times: [0, 0.5, 0.58, 0.78, 0.9] })}
      />
      <motion.g
        initial={{ opacity: 1 }}
        animate={{ opacity: [1, 1, 0] }}
        transition={t(D, { times: [0, 0.78, 0.86] })}
      >
        <rect
          x="92"
          y="56"
          width="262"
          height="140"
          rx="10"
          fill="none"
          stroke="var(--line-strong)"
          strokeWidth="1.6"
          strokeDasharray="6 5"
        />
        <text
          x="223"
          y="130"
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          className="fill-muted font-sans"
        >
          Drop PDFs here
        </text>
      </motion.g>

      {/* The two files, picked up together. */}
      <motion.g
        initial={{ x: 12, y: 132, opacity: 1 }}
        animate={{
          x: [12, 12, 12, 192, 192, 192],
          y: [132, 132, 128, 92, 92, 92],
          opacity: [1, 1, 1, 1, 0, 0],
          scale: [1, 1, 1.06, 1.06, 0.8, 0.8],
        }}
        transition={t(D, { times })}
      >
        <g transform="translate(8 -6) rotate(8 16 21)">
          <FileIcon tone="sky" />
        </g>
        <FileIcon tone="coral" />
        <g transform="translate(26 -8)">
          <circle r="7" fill="var(--violet)" />
          <text y="2.6" textAnchor="middle" fontSize="8" fontWeight="800" fill="#fff">
            2
          </text>
        </g>
      </motion.g>

      {/* They open as two pages. */}
      {[
        { at: THUMB_A, tone: 'coral', delay: 0 },
        { at: THUMB_B, tone: 'sky', delay: 0.08 },
      ].map(({ at, tone, delay }) => (
        <motion.g
          key={tone}
          initial={{ x: 196, y: 84, opacity: 0, scale: 0.6 }}
          animate={{ x: at.x, y: at.y, opacity: 1, scale: 1 }}
          transition={t(0.45, {
            type: 'spring',
            stiffness: 260,
            damping: 18,
            delay: D * 0.8 + delay,
          })}
        >
          <Page tone={tone} />
        </motion.g>
      ))}

      <motion.g
        initial={{ x: 70, y: 196 }}
        animate={{
          x: [70, 26, 26, 206, 206, 330],
          y: [196, 150, 150, 112, 112, 196],
          scale: [1, 1, 0.85, 0.85, 1, 1],
        }}
        transition={t(D, { times })}
      >
        <Cursor />
      </motion.g>
    </g>
  );
}

/** Step 2: the pages slide together while a real-looking progress bar fills. */
function WorkLayer({
  t,
  still,
}: {
  t: (d: number, extra?: Transition) => Transition;
  still: boolean;
}) {
  const D = 3;
  const pct = useMotionValue(still ? 100 : 0);
  const label = useTransform(pct, (v) => `${Math.round(v)}%`);
  const width = useTransform(pct, (v) => (v / 100) * 206);

  useEffect(() => {
    if (still) return;
    const run = animate(pct, 100, { duration: D * 0.62, delay: D * 0.28, ease: [0.3, 0, 0.4, 1] });
    return () => run.stop();
  }, [pct, still]);

  return (
    <g>
      {/* The window works: its edge breathes in violet. */}
      <motion.rect
        x={WIN.x - 3}
        y={WIN.y - 3}
        width={WIN.w + 6}
        height={WIN.h + 6}
        rx="17"
        fill="none"
        stroke="var(--violet)"
        strokeWidth="2.5"
        initial={{ opacity: 0 }}
        animate={still ? { opacity: 0.6 } : { opacity: [0, 0.8, 0.25, 0.8, 0.25, 0.7, 0] }}
        transition={t(D, { times: [0, 0.15, 0.35, 0.55, 0.75, 0.9, 1] })}
      />
      {/* Back page slides under, front page lands on top. */}
      <motion.g
        initial={{ x: THUMB_B.x, y: THUMB_B.y }}
        animate={{ x: MERGED.x + 6, y: MERGED.y + 6, rotate: 4 }}
        transition={t(0.6, { type: 'spring', stiffness: 200, damping: 20, delay: 0.25 })}
      >
        <Page tone="sky" />
      </motion.g>
      <motion.g
        initial={{ x: THUMB_A.x, y: THUMB_A.y }}
        animate={{ x: MERGED.x, y: MERGED.y, rotate: -2 }}
        transition={t(0.6, { type: 'spring', stiffness: 200, damping: 20, delay: 0.35 })}
      >
        <Page tone="coral" />
      </motion.g>

      <motion.g
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={t(0.3, { delay: D * 0.22 })}
      >
        <text x="120" y="160" fontSize="9" fontWeight="700" className="fill-fg font-sans">
          Merging on this device
        </text>
        <motion.text
          x="326"
          y="160"
          textAnchor="end"
          fontSize="9"
          fontWeight="800"
          fill="var(--violet)"
          className="font-sans tabular-nums"
        >
          {label}
        </motion.text>
        <rect x="120" y="168" width="206" height="7" rx="3.5" style={{ fill: 'var(--line)' }} />
        <motion.rect x="120" y="168" height="7" rx="3.5" fill="var(--violet)" style={{ width }} />
      </motion.g>

      {/* Packets try the line to the servers and bounce off the cut. */}
      {still
        ? null
        : [0, 1, 2].map((i) => (
            <motion.circle
              key={i}
              r="2.6"
              fill="var(--coral)"
              initial={{ cx: 370, cy: 96, opacity: 0 }}
              animate={{ cx: [370, 386, 378], cy: [96, 89, 93], opacity: [0, 1, 0] }}
              transition={{ duration: 0.7, delay: 0.6 + i * 0.75, ease: 'easeOut' }}
            />
          ))}
    </g>
  );
}

/** Step 3: a click on Download and the file drops into the dock's folder. */
function SaveLayer({ t }: { t: (d: number, extra?: Transition) => Transition }) {
  const D = 2.8;
  return (
    <g>
      {/* The merged file, with a done tick. */}
      <motion.g
        initial={{ x: MERGED.x, y: MERGED.y, opacity: 1 }}
        animate={{ opacity: [1, 1, 0.35] }}
        transition={t(D, { times: [0, 0.55, 0.65] })}
      >
        <g transform="translate(6 6) rotate(4 27 35)">
          <Page tone="sky" />
        </g>
        <g transform="rotate(-2 27 35)">
          <Page tone="coral" />
        </g>
        <motion.g
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={t(0.4, { type: 'spring', stiffness: 420, damping: 14, delay: 0.1 })}
          style={{ x: 56, y: 2 }}
        >
          <circle r="10" fill="var(--mint)" />
          <path
            d="M-4.5 0.5l3 3 6-6.5"
            fill="none"
            stroke="#fff"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.g>
      </motion.g>

      {/* The Download button, pressed by the pointer. */}
      <motion.g
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0, scale: [1, 1, 0.92, 1] }}
        transition={{
          ...t(0.3, { delay: 0.15 }),
          scale: t(D, { times: [0, 0.46, 0.5, 0.56] }),
        }}
      >
        <rect x="175" y="166" width="96" height="24" rx="12" fill="var(--violet)" />
        <path
          d="M190 172v8m-3.5-3.5 3.5 3.5 3.5-3.5M186 183h8"
          fill="none"
          stroke="#fff"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text x="232" y="181.5" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff">
          Download
        </text>
      </motion.g>

      {/* The saved file arcs down into Downloads. */}
      <motion.g
        initial={{ x: MERGED.x, y: MERGED.y, opacity: 0, scale: 1 }}
        animate={{
          x: [MERGED.x, MERGED.x, 250, FOLDER.x - 2],
          y: [MERGED.y, MERGED.y, 120, FOLDER.y - 6],
          scale: [1, 1, 0.7, 0.32],
          opacity: [0, 1, 1, 0],
        }}
        transition={t(D, { times: [0, 0.52, 0.7, 0.86] })}
      >
        <Page tone="mint" />
      </motion.g>

      {/* The dock's badge and a little "Saved" note. */}
      <motion.g
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={t(0.35, { type: 'spring', stiffness: 500, damping: 14, delay: D * 0.88 })}
        style={{ x: FOLDER.x + 26, y: FOLDER.y }}
      >
        <circle r="6.5" fill="var(--coral)" />
        <text y="2.8" textAnchor="middle" fontSize="8" fontWeight="800" fill="#fff">
          1
        </text>
      </motion.g>
      <motion.g
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={t(0.3, { delay: D * 0.9 })}
      >
        <rect
          x="300"
          y="226"
          width="102"
          height="20"
          rx="10"
          style={{ fill: 'var(--canvas-raised)' }}
          stroke="var(--line-strong)"
        />
        <text
          x="351"
          y="239.5"
          textAnchor="middle"
          fontSize="8.5"
          fontWeight="700"
          className="fill-fg font-sans"
        >
          report-merged.pdf
        </text>
      </motion.g>

      <motion.g
        initial={{ x: 330, y: 196 }}
        animate={{
          x: [330, 330, 236, 236, 250],
          y: [196, 196, 180, 180, 200],
          scale: [1, 1, 1, 0.82, 1],
        }}
        transition={t(D, { times: [0, 0.12, 0.44, 0.5, 0.62] })}
      >
        <Cursor />
      </motion.g>
    </g>
  );
}

/**
 * A small, realistic picture of what happens to a file: dragged into a browser
 * tab, merged on the device while the line to the servers stays cut, then
 * saved into Downloads. `step` picks the moment; with reduced motion each
 * moment is shown at rest.
 */
export function HeroScene({ step, className = '' }: { step: StoryStep; className?: string }) {
  const still = useStillMotion();
  /** A transition, or an instant jump with reduced motion. */
  const t = (duration: number, extra: Transition = {}): Transition =>
    still ? { duration: 0 } : { duration, ease: 'easeInOut', ...extra };

  return (
    <svg
      viewBox="0 0 480 282"
      className={`h-auto w-full ${className}`}
      role="img"
      aria-label={
        [
          'Two PDFs are dragged from the desktop into a browser tab.',
          'The tab merges them on this device. The line to the servers stays cut.',
          'Download is clicked and the merged file drops into the Downloads folder.',
        ][step]
      }
      data-step={step}
    >
      {/* Servers, far away, behind a line that is cut. */}
      <g opacity="0.75">
        <path
          d="M414 74a14 14 0 0 1 3-27 19 19 0 0 1 36 5 11 11 0 0 1-2 22Z"
          fill="none"
          stroke="var(--muted)"
          strokeWidth="1.6"
          strokeDasharray="4 4"
        />
        <text
          x="432"
          y="92"
          textAnchor="middle"
          fontSize="9"
          fontWeight="600"
          className="fill-muted font-sans"
        >
          servers
        </text>
      </g>
      <path
        d="M368 96l9-3.5M398 85.5l12-4.5"
        stroke="var(--line-strong)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <g transform="translate(388 89)">
        <motion.g
          animate={
            step === 1 && !still
              ? { scale: [1, 1.25, 1], rotate: [0, -8, 0] }
              : { scale: 1, rotate: 0 }
          }
          transition={
            step === 1 && !still ? { duration: 0.75, repeat: 3, delay: 0.55 } : { duration: 0.2 }
          }
        >
          <circle r="8" style={{ fill: 'var(--canvas)' }} stroke="var(--mint)" strokeWidth="1.8" />
          <path
            d="M-3.5-3.5l7 7m0-7-7 7"
            stroke="var(--mint)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </motion.g>
      </g>

      {/* The browser window. */}
      <rect
        x={WIN.x}
        y={WIN.y}
        width={WIN.w}
        height={WIN.h}
        rx="14"
        style={{ fill: 'var(--surface-strong)' }}
        stroke="var(--line-strong)"
        strokeWidth="1.6"
      />
      <path d={`M${WIN.x} 44h${WIN.w}`} stroke="var(--line-strong)" strokeWidth="1.4" />
      {['coral', 'sunshine', 'mint'].map((c, i) => (
        <circle
          key={c}
          cx={WIN.x + 16 + i * 11}
          cy="31"
          r="3.3"
          fill={`var(--${c})`}
          opacity="0.85"
        />
      ))}
      <rect x="150" y="24" width="150" height="14" rx="7" style={{ fill: 'var(--line)' }} />
      <path
        d="M161 30.5v-1.6a2.6 2.6 0 0 1 5.2 0v1.6M159.8 30.5h7.6v5h-7.6Z"
        fill="none"
        stroke="var(--mint)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <text x="232" y="34.2" textAnchor="middle" fontSize="8" className="fill-muted font-sans">
        privacy-toolkit
      </text>

      {/* The dock, with Downloads at the end. */}
      <rect
        x="150"
        y="228"
        width="146"
        height="36"
        rx="12"
        style={{ fill: 'var(--surface-strong)' }}
        stroke="var(--line)"
        strokeWidth="1.2"
      />
      {['violet', 'sunshine', 'sky'].map((c, i) => (
        <rect
          key={c}
          x={162 + i * 30}
          y="235"
          width="22"
          height="22"
          rx="6"
          fill={`var(--${c})`}
          opacity="0.35"
        />
      ))}
      <motion.g
        animate={step === 2 && !still ? { y: [0, 0, -7, 0] } : { y: 0 }}
        transition={
          step === 2 && !still ? { duration: 2.8, times: [0, 0.84, 0.9, 1] } : { duration: 0.2 }
        }
      >
        <path
          d={`M${FOLDER.x} ${FOLDER.y + 2}a3 3 0 0 1 3-3h6l3 3h10a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H${FOLDER.x + 3}a3 3 0 0 1-3-3Z`}
          fill="var(--sky)"
          fillOpacity="0.25"
          stroke="var(--sky)"
          strokeWidth="1.6"
        />
        <path
          d={`M${FOLDER.x + 12.5} ${FOLDER.y + 5}v8m-3-3 3 3 3-3`}
          fill="none"
          stroke="var(--sky)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </motion.g>
      <text
        x="275"
        y="276"
        textAnchor="middle"
        fontSize="7.5"
        fontWeight="600"
        fill="var(--sky)"
        className="font-sans"
      >
        Downloads
      </text>

      {/* The moment on stage. */}
      <g key={step}>
        {step === 0 ? <DropLayer t={t} /> : null}
        {step === 1 ? <WorkLayer t={t} still={still} /> : null}
        {step === 2 ? <SaveLayer t={t} /> : null}
      </g>
    </svg>
  );
}
