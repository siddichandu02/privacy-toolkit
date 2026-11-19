import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { useStillMotion } from '../../useStillMotion';
import type { Accent } from '../ui/accent';

const ACCENTS: Accent[] = ['violet', 'coral', 'mint', 'sunshine', 'sky'];

/** Small seeded random source so a burst looks the same on every render. */
function seeded(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

type Shape = 'fold' | 'kite' | 'strip';
interface Piece {
  id: number;
  shape: Shape;
  color: Accent;
  size: number;
  x: number;
  rise: number;
  fall: number;
  spin: number;
  flip: number;
  delay: number;
  duration: number;
}

function makePieces(count: number, accent: Accent, seed = 7): Piece[] {
  const rand = seeded(seed);
  const shapes: Shape[] = ['fold', 'kite', 'strip'];
  return Array.from({ length: count }, (_, id) => {
    const angle = (rand() - 0.5) * Math.PI * 0.95;
    const power = 120 + rand() * 170;
    return {
      id,
      shape: shapes[Math.floor(rand() * shapes.length)] ?? 'fold',
      // Half the paper is the tool's own color, the rest borrowed from the others.
      color: rand() < 0.5 ? accent : (ACCENTS[Math.floor(rand() * ACCENTS.length)] ?? accent),
      size: 9 + rand() * 9,
      x: Math.sin(angle) * power * 1.4,
      rise: -(Math.cos(angle) * power * 0.9 + 40),
      fall: 220 + rand() * 180,
      spin: (rand() - 0.5) * 900,
      flip: 360 + rand() * 720,
      delay: rand() * 0.12,
      duration: 1.5 + rand() * 0.9,
    };
  });
}

/** One scrap of folded paper: a lit face and a shaded face either side of a crease. */
function Scrap({ shape, color }: { shape: Shape; color: Accent }) {
  const base = `var(--${color})`;
  const light = `color-mix(in srgb, var(--${color}) 62%, white)`;
  if (shape === 'strip') {
    return (
      <svg viewBox="0 0 10 24" className="size-full" aria-hidden="true">
        <polygon points="0,0 10,3 10,24 0,21" fill={base} />
        <polygon points="0,0 10,3 10,10 0,7" fill={light} />
      </svg>
    );
  }
  if (shape === 'kite') {
    return (
      <svg viewBox="0 0 20 20" className="size-full" aria-hidden="true">
        <polygon points="10,0 20,10 10,20" fill={base} />
        <polygon points="10,0 0,10 10,20" fill={light} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" className="size-full" aria-hidden="true">
      <polygon points="0,0 20,0 0,20" fill={light} />
      <polygon points="20,0 20,20 0,20" fill={base} />
    </svg>
  );
}

export interface PaperConfettiProps {
  accent: Accent;
  /** Change it to fire a fresh burst. */
  burst: number;
  count?: number;
  className?: string;
}

/**
 * A burst of folded paper scraps that pop up from one point and flutter down.
 * Purely decorative, and skipped entirely when motion is reduced.
 */
export function PaperConfetti({ accent, burst, count = 34, className = '' }: PaperConfettiProps) {
  const still = useStillMotion();
  const pieces = useMemo(() => makePieces(count, accent, burst + 7), [count, accent, burst]);
  if (still || burst === 0) return null;
  return (
    <div
      aria-hidden="true"
      data-testid="confetti"
      className={`pointer-events-none absolute inset-x-0 top-0 h-0 ${className}`}
    >
      {pieces.map((p) => (
        <motion.span
          key={`${burst}-${p.id}`}
          className="absolute top-0 left-1/2 block"
          style={{ width: p.size, height: p.size, marginLeft: -p.size / 2 }}
          initial={{ x: 0, y: 0, rotate: 0, rotateY: 0, opacity: 0, scale: 0.4 }}
          animate={{
            x: [0, p.x, p.x * 1.15],
            y: [0, p.rise, p.rise + p.fall],
            rotate: [0, p.spin * 0.5, p.spin],
            rotateY: [0, p.flip * 0.4, p.flip],
            opacity: [0, 1, 1, 0],
            scale: [0.4, 1, 1, 0.9],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            times: [0, 0.32, 1],
            ease: ['easeOut', 'easeIn'],
            opacity: {
              duration: p.duration,
              delay: p.delay,
              times: [0, 0.08, 0.75, 1],
              ease: 'linear',
            },
            scale: {
              duration: p.duration,
              delay: p.delay,
              times: [0, 0.2, 0.8, 1],
              ease: 'linear',
            },
          }}
        >
          <Scrap shape={p.shape} color={p.color} />
        </motion.span>
      ))}
    </div>
  );
}
