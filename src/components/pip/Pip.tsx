import { motion, useAnimationControls } from 'framer-motion';
import { useStillMotion } from '../../useStillMotion';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Accent } from '../ui/accent';

export type PipPose = 'sit' | 'wave' | 'puzzled' | 'hold';

export interface PipProps {
  pose?: PipPose;
  /** Paper color. Defaults to coral, so Pip never reads as a stock orange fox. */
  accent?: Accent;
  /** Accessible name. Without it Pip is decorative and hidden from screen readers. */
  title?: string;
  className?: string;
}

/*
 * Three folds of the same sheet: light where the paper faces up, base on the
 * flat, shade on the far side of a crease. Mixing from the theme variable means
 * Pip follows light/dark mode and each tool's accent for free.
 */
const paper = (accent: Accent): CSSProperties =>
  ({
    '--pip': `var(--${accent})`,
    '--pip-base': 'var(--pip)',
    '--pip-light': 'color-mix(in srgb, var(--pip) 70%, white)',
    '--pip-shade': 'color-mix(in srgb, var(--pip) 72%, #1b1033)',
    '--pip-deep': 'color-mix(in srgb, var(--pip) 48%, #1b1033)',
  }) as CSSProperties;

const fill = (v: string): CSSProperties => ({ fill: `var(--pip-${v})` });
const WHITE = '#fbf9ff';
const WHITE_SHADE = '#e4ddf3';
const INK = '#1b1633';
const CREASE = {
  stroke: 'rgb(27 16 51 / 0.18)',
  strokeWidth: 0.8,
  strokeLinecap: 'round',
} as const;

const between = (min: number, max: number) => min + Math.random() * (max - min);

/** Schedules `fn` again and again at random intervals until unmounted. */
function useRandomTimer(enabled: boolean, min: number, max: number, fn: () => void) {
  const latest = useRef(fn);
  useEffect(() => {
    latest.current = fn;
  });
  useEffect(() => {
    if (!enabled) return;
    let id: ReturnType<typeof setTimeout>;
    const next = () => {
      id = setTimeout(
        () => {
          latest.current();
          next();
        },
        between(min, max),
      );
    };
    next();
    return () => clearTimeout(id);
  }, [enabled, min, max]);
}

/**
 * Pip, the paper fox. Built from flat folded facets so every part can move on
 * its own: ears twitch, eyes blink, tail sways, and a paw waves hello.
 */
export function Pip({ pose = 'sit', accent = 'coral', title, className }: PipProps) {
  const reduced = useStillMotion();
  const animated = !reduced;
  const [blink, setBlink] = useState(false);
  const leftEar = useAnimationControls();
  const rightEar = useAnimationControls();

  useRandomTimer(animated, 2200, 5600, () => {
    setBlink(true);
    setTimeout(() => setBlink(false), 130);
  });
  useRandomTimer(animated, 3800, 8500, () => {
    const ear = Math.random() < 0.5 ? leftEar : rightEar;
    const dir = ear === leftEar ? -1 : 1;
    void ear.start({
      rotate: [0, 14 * dir, -4 * dir, 0],
      transition: { duration: 0.45, ease: 'easeOut' },
    });
  });

  const tilt = pose === 'puzzled' ? 9 : 0;

  return (
    <svg
      viewBox="0 0 160 180"
      className={className}
      style={paper(accent)}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      data-pose={pose}
      data-animated={animated}
      overflow="visible"
    >
      <ellipse cx="82" cy="172" rx="46" ry="5" fill="currentColor" opacity="0.12" />

      {/* Tail, behind the body */}
      <motion.g
        data-part="tail"
        style={{ originX: 0.05, originY: 0.95 }}
        animate={animated ? { rotate: [0, 6, 0] } : undefined}
        transition={{ duration: 3.4, ease: 'easeInOut', repeat: Infinity }}
      >
        <polygon points="94,168 148,92 146,146" style={fill('base')} />
        <polygon points="94,168 146,146 120,172" style={fill('shade')} />
        <polygon points="148,92 147.4,107 137.2,107.2" fill={WHITE} />
        <line x1="94" y1="168" x2="148" y2="92" {...CREASE} />
      </motion.g>

      {/* Body and chest */}
      <polygon points="52,170 80,170 80,100 62,100" style={fill('light')} />
      <polygon points="80,170 108,170 98,100 80,100" style={fill('base')} />
      <polygon points="80,104 92,128 80,156 68,128" fill={WHITE} />
      <polygon points="80,104 92,128 80,156" fill={WHITE_SHADE} />
      <polygon points="58,170 65,158 76,158 78,170" fill={WHITE} />
      <polygon points="82,170 84,158 95,158 102,170" fill={WHITE_SHADE} />

      {pose === 'wave' ? (
        <motion.g
          data-part="paw"
          style={{ originX: 0.1, originY: 1 }}
          animate={animated ? { rotate: [0, -24, 8, -24, 0] } : undefined}
          transition={{ duration: 1.4, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1.6 }}
        >
          <polygon points="92,112 104,121 130,84 120,77" style={fill('base')} />
          <polygon points="104,121 130,84 124,82" style={fill('shade')} />
          <polygon points="120,77 130,84 133,72 124,68" fill={WHITE} />
        </motion.g>
      ) : null}

      {pose === 'hold' ? (
        <g data-part="paw">
          {/* Reaches out to the right and grips a handle at about (142, 117). */}
          <polygon points="90,108 100,124 140,122 140,112" style={fill('base')} />
          <polygon points="100,124 140,122 140,118" style={fill('shade')} />
          <ellipse cx="142" cy="117" rx="6" ry="6.5" fill={WHITE} />
        </g>
      ) : null}

      {/* Head, ears and face move together when Pip tilts */}
      <motion.g
        data-part="head"
        style={{ originX: 0.5, originY: 0.95 }}
        initial={false}
        animate={{ rotate: tilt }}
        transition={{ type: 'spring', stiffness: 220, damping: 14 }}
      >
        <motion.g data-part="ear-left" style={{ originX: 0.5, originY: 1 }} animate={leftEar}>
          <polygon points="42,48 50,16 70,46" style={fill('base')} />
          <polygon points="50,44 52,27 63,45" style={fill('deep')} />
        </motion.g>
        <motion.g data-part="ear-right" style={{ originX: 0.5, originY: 1 }} animate={rightEar}>
          <polygon points="90,46 110,16 118,48" style={fill('shade')} />
          <polygon points="97,45 108,27 110,44" style={fill('deep')} />
        </motion.g>

        <polygon points="40,46 80,46 80,104" style={fill('base')} />
        <polygon points="80,46 120,46 80,104" style={fill('shade')} />
        <polygon points="56,46 104,46 80,64" style={fill('light')} />
        <polygon points="57,70 80,70 80,104" fill={WHITE} />
        <polygon points="80,70 103,70 80,104" fill={WHITE_SHADE} />
        <line x1="80" y1="46" x2="80" y2="104" {...CREASE} />
        <polygon points="75,96 85,96 80,103" fill={INK} />

        <motion.g
          data-part="eyes"
          data-blink={blink}
          style={{ originY: 0.5 }}
          animate={{ scaleY: blink ? 0.1 : 1 }}
          transition={{ duration: 0.07 }}
        >
          <ellipse cx="66" cy="60" rx="3.6" ry="4.4" fill={INK} />
          <ellipse cx="94" cy="60" rx="3.6" ry="4.4" fill={INK} />
          <circle cx="67.2" cy="58.4" r="1.1" fill={WHITE} />
          <circle cx="95.2" cy="58.4" r="1.1" fill={WHITE} />
        </motion.g>
      </motion.g>

      {pose === 'puzzled' ? (
        <motion.text
          data-part="question"
          x="128"
          y="40"
          fontSize="30"
          fontWeight="800"
          fontFamily="var(--font-display)"
          style={fill('base')}
          animate={animated ? { y: [40, 34, 40], rotate: [8, 14, 8] } : undefined}
          transition={{ duration: 2.4, ease: 'easeInOut', repeat: Infinity }}
        >
          ?
        </motion.text>
      ) : null}
    </svg>
  );
}
