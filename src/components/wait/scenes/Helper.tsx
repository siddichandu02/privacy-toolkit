import { motion } from 'framer-motion';
import { useContext, useEffect, useRef } from 'react';
import type { Accent } from '../../ui/accent';
import { HelperGhost } from './helperGhost';

/** Timing for a helper that keeps throwing pages (merge), in seconds. */
export interface HelperThrow {
  /** Seconds after mount before the first throw. */
  delay: number;
  /** One throw every this many seconds. */
  cycle: number;
  /** Seconds into each throw when the page leaves the paw. */
  hold: number;
}

/**
 * One of Pip's paper helpers: a folded paper bird-blob with dot eyes and tiny
 * feet. Inside a scene with 3D helpers (With3DHelpers) the drawing turns
 * invisible and only its markers stay, which the 3D layer follows: feet and
 * head points, and what the helper is doing.
 */
export function Helper({
  x,
  y,
  color,
  sitting = false,
  hopping = false,
  delay = 0,
  throwing,
}: {
  x: number;
  y: number;
  color: Accent;
  sitting?: boolean;
  hopping?: boolean;
  delay?: number;
  throwing?: HelperThrow;
}) {
  const ghost = useContext(HelperGhost);
  const anchor = useRef<SVGGElement>(null);
  // When this helper appeared, so 3D throws line up with the scene's page tosses.
  useEffect(() => {
    if (anchor.current) anchor.current.dataset.t0 = String(performance.now());
  }, []);

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
        <g opacity={ghost ? 0 : 1}>
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
        {/* Markers for the 3D layer: where the feet and head are right now. */}
        <g
          ref={anchor}
          data-helper-anchor=""
          data-color={color}
          data-sitting={sitting}
          data-hopping={hopping}
          data-throw-delay={throwing?.delay}
          data-throw-cycle={throwing?.cycle}
          data-throw-hold={throwing?.hold}
          opacity={0}
        >
          <circle data-anchor="feet" cx={0} cy={15} r={0.2} />
          <circle data-anchor="head" cx={0} cy={-2} r={0.2} />
        </g>
      </g>
    </motion.g>
  );
}
