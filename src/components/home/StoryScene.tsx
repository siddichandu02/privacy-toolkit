import { motion, type Transition } from 'framer-motion';
import { useStillMotion } from '../../useStillMotion';

export type StoryStep = 0 | 1 | 2;

const SPRING: Transition = { type: 'spring', stiffness: 170, damping: 20 };
const SOFT: Transition = { duration: 0.35, ease: 'easeOut' };

/** A sheet of paper with a folded corner and a few lines of "text". */
function Sheet({ tone }: { tone: 'coral' | 'sky' | 'mint' }) {
  return (
    <g>
      <path d="M0 0h34l12 12v50H0Z" style={{ fill: 'var(--canvas-raised)' }} />
      <path d="M0 0h34l12 12v50H0Z" fill="none" stroke={`var(--${tone})`} strokeWidth="2" />
      <path d="M34 0v12h12" fill="none" stroke={`var(--${tone})`} strokeWidth="2" />
      <path
        d="M8 22h26M8 30h30M8 38h22M8 46h28"
        stroke={`var(--${tone})`}
        strokeOpacity="0.55"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </g>
  );
}

/**
 * The browser tab the file lives in, the server it never visits, and the
 * folder it comes home to. `step` picks which moment is on stage:
 * 0 the file drops in, 1 the device works on it, 2 it goes to Downloads.
 */
export function StoryScene({ step, className = '' }: { step: StoryStep; className?: string }) {
  const still = useStillMotion();
  const move = still ? SOFT : SPRING;
  const working = step === 1;

  // Where each sheet sits in each moment (window spans x 24-284, y 44-220).
  const a = [
    { x: 90, y: 92, rotate: -8 },
    { x: 118, y: 100, rotate: 0 },
    { x: 130, y: 248, rotate: 0 },
  ][step];
  const b = [
    { x: 172, y: 96, rotate: 9 },
    { x: 118, y: 100, rotate: 0 },
    { x: 130, y: 248, rotate: 0 },
  ][step];

  return (
    <svg
      viewBox="0 0 400 330"
      className={`h-auto w-full overflow-visible ${className}`}
      role="img"
      aria-label={
        [
          'A file drops into a browser tab.',
          'The file is worked on inside the tab. The line to the server stays cut.',
          'The finished file goes down into your Downloads folder.',
        ][step]
      }
      data-step={step}
    >
      {/* The server, far away and never reached. */}
      <g opacity={working ? 0.9 : 0.45} style={{ transition: 'opacity 300ms' }}>
        <path
          d="M330 104a20 20 0 0 1 4-39 26 26 0 0 1 49 8 16 16 0 0 1-3 31Z"
          fill="none"
          stroke="var(--muted)"
          strokeWidth="2"
          strokeDasharray="5 5"
        />
        <text
          x="356"
          y="126"
          textAnchor="middle"
          className="fill-muted font-sans"
          fontSize="12"
          fontWeight="600"
        >
          servers
        </text>
      </g>
      {/* The line out of the tab, with a gap where nothing crosses. */}
      <path
        d="M286 112h14M332 112h0"
        stroke="var(--line-strong)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <motion.g
        animate={{ opacity: working ? 1 : 0.5, scale: working && !still ? [1, 1.18, 1] : 1 }}
        transition={working && !still ? { duration: 1.4, repeat: Infinity } : SOFT}
      >
        <circle
          cx="312"
          cy="112"
          r="11"
          style={{ fill: 'var(--canvas)' }}
          stroke="var(--mint)"
          strokeWidth="2"
        />
        <path
          d="M307 107l10 10M317 107l-10 10"
          stroke="var(--mint)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </motion.g>

      {/* The browser tab. */}
      <rect
        x="24"
        y="44"
        width="262"
        height="176"
        rx="18"
        style={{ fill: 'var(--surface-strong)' }}
        stroke="var(--line-strong)"
        strokeWidth="2"
      />
      <path d="M24 74h262" stroke="var(--line-strong)" strokeWidth="2" />
      {['coral', 'sunshine', 'mint'].map((c, i) => (
        <circle key={c} cx={44 + i * 14} cy="59" r="4" fill={`var(--${c})`} opacity="0.8" />
      ))}
      <rect x="100" y="52" width="140" height="14" rx="7" style={{ fill: 'var(--line)' }} />
      <text x="170" y="62.5" textAnchor="middle" fontSize="9" className="fill-muted font-sans">
        your browser tab
      </text>

      {/* The work ring: only spins while the device is busy. */}
      <motion.circle
        cx="141"
        cy="131"
        r="56"
        fill="none"
        stroke="var(--violet)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="40 22"
        animate={{ opacity: working ? 0.9 : 0, rotate: working && !still ? 360 : 0 }}
        transition={
          working && !still
            ? { rotate: { duration: 3, ease: 'linear', repeat: Infinity }, opacity: SOFT }
            : SOFT
        }
      />

      {/* The Downloads folder on your device. */}
      <motion.g
        animate={{ opacity: step === 2 ? 1 : 0.35, y: step === 2 && !still ? -4 : 0 }}
        transition={move}
      >
        <path
          d="M104 262h28l8 8h68a8 8 0 0 1 8 8v36a8 8 0 0 1-8 8H104a8 8 0 0 1-8-8v-44a8 8 0 0 1 8-8Z"
          fill="none"
          stroke="var(--sky)"
          strokeWidth="2"
        />
        <text
          x="156"
          y="312"
          textAnchor="middle"
          fontSize="12"
          fontWeight="600"
          fill="var(--sky)"
          className="font-sans"
        >
          Downloads
        </text>
      </motion.g>

      {/* The two sheets: dropped in, joined into one, saved. */}
      <motion.g initial={false} animate={{ ...a, opacity: step === 2 ? 0 : 1 }} transition={move}>
        <Sheet tone="coral" />
      </motion.g>
      <motion.g initial={false} animate={{ ...b, opacity: step === 2 ? 0 : 1 }} transition={move}>
        <Sheet tone="sky" />
      </motion.g>
      {/* The result: a fresh mint sheet that slides out of the tab. */}
      <motion.g
        initial={false}
        animate={
          step === 2
            ? { x: 140, y: still ? 240 : 234, opacity: 1, scale: 0.7 }
            : { x: 118, y: 100, opacity: 0, scale: 1 }
        }
        transition={move}
      >
        <Sheet tone="mint" />
      </motion.g>
    </svg>
  );
}
