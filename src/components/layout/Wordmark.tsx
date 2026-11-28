import { motion } from 'framer-motion';
import type { CSSProperties } from 'react';

/*
 * Pip's folded-paper head, cropped from the full fox so the logo and the
 * mascot are the same paper. Same three folds (light, base, shade) mixed from
 * the coral accent, so it follows the theme.
 */
const PAPER = {
  '--wm': 'var(--coral)',
  '--wm-light': 'color-mix(in srgb, var(--wm) 70%, white)',
  '--wm-shade': 'color-mix(in srgb, var(--wm) 72%, #1b1033)',
  '--wm-deep': 'color-mix(in srgb, var(--wm) 48%, #1b1033)',
} as CSSProperties;

const f = (v: string): CSSProperties => ({ fill: `var(--wm${v ? `-${v}` : ''})` });
const WHITE = '#fbf9ff';
const WHITE_SHADE = '#e4ddf3';
const INK = '#1b1633';
const EAR = { type: 'spring', stiffness: 520, damping: 9 } as const;

/** Pip's head. The ears flick when a parent motion element enters "hover". */
export function WordmarkIcon({ className = '' }: { className?: string }) {
  return (
    <motion.svg viewBox="36 12 88 96" className={className} style={PAPER} aria-hidden="true">
      <motion.g
        style={{ transformOrigin: '56px 46px' }}
        variants={{ rest: { rotate: 0 }, hover: { rotate: -12 } }}
        transition={EAR}
      >
        <polygon points="42,48 50,16 70,46" style={f('')} />
        <polygon points="50,44 52,27 63,45" style={f('deep')} />
      </motion.g>
      <motion.g
        style={{ transformOrigin: '104px 46px' }}
        variants={{ rest: { rotate: 0 }, hover: { rotate: 12 } }}
        transition={{ ...EAR, delay: 0.05 }}
      >
        <polygon points="90,46 110,16 118,48" style={f('shade')} />
        <polygon points="97,45 108,27 110,44" style={f('deep')} />
      </motion.g>
      <polygon points="40,46 80,46 80,104" style={f('')} />
      <polygon points="80,46 120,46 80,104" style={f('shade')} />
      <polygon points="56,46 104,46 80,64" style={f('light')} />
      <polygon points="57,70 80,70 80,104" fill={WHITE} />
      <polygon points="80,70 103,70 80,104" fill={WHITE_SHADE} />
      <polygon points="75,96 85,96 80,103" fill={INK} />
      <ellipse cx="66" cy="60" rx="4" ry="4.8" fill={INK} />
      <ellipse cx="94" cy="60" rx="4" ry="4.8" fill={INK} />
    </motion.svg>
  );
}

/**
 * "PDFPip" set in the display face. The dot on the i is a little folded ear,
 * the one place the fox shows up inside the name.
 */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span
      className={`font-display leading-none font-bold tracking-tight whitespace-nowrap ${className}`}
    >
      PDFP
      <span className="relative inline-block">
        {'ı'}
        <svg
          viewBox="0 0 10 10"
          className="absolute top-[0.02em] left-1/2 h-[0.3em] w-[0.3em] -translate-x-1/2 text-coral"
          aria-hidden="true"
        >
          <polygon points="1,9.5 4.5,0.5 9,9.5" fill="currentColor" />
        </svg>
      </span>
      p
    </span>
  );
}
