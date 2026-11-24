import { motion } from 'framer-motion';
import { useId } from 'react';
import type { PhotoLocation } from '../../lib/image/exif-details';
import { useStillMotion } from '../../useStillMotion';

import { C, project, R } from './globe-math';

/** A line through projected points, broken where it goes round the back. */
function path(points: [number, number][], lat0: number, lon0: number): string {
  let d = '';
  let pen = false;
  for (const [lat, lon] of points) {
    const p = project(lat, lon, lat0, lon0);
    if (!p) {
      pen = false;
      continue;
    }
    d += `${pen ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    pen = true;
  }
  return d;
}

const range = (from: number, to: number, step: number) =>
  Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);

/**
 * A small wire globe, turned a little away from the spot so the pin sits off
 * centre and the curve of the earth shows. No map tiles: nothing is fetched,
 * and the coordinates never leave the page.
 */
export function Globe({
  location,
  className = '',
}: {
  location: PhotoLocation;
  className?: string;
}) {
  const still = useStillMotion();
  const id = useId().replace(/:/g, '');
  const lon0 = location.lon - 25;
  const lat0 = Math.max(-45, Math.min(45, location.lat * 0.6 + 10));
  const pin = project(location.lat, location.lon, lat0, lon0) ?? { x: C, y: C };

  const meridians = range(-180, 150, 30).map((lon) =>
    path(
      range(-90, 90, 5).map((lat) => [lat, lon]),
      lat0,
      lon0,
    ),
  );
  const parallels = range(-60, 60, 30).map((lat) =>
    path(
      range(-180, 180, 5).map((lon) => [lat, lon]),
      lat0,
      lon0,
    ),
  );

  return (
    <svg
      viewBox="0 0 96 96"
      className={className}
      role="img"
      aria-label={`Globe with a pin where the photo was taken`}
      data-testid="globe"
    >
      <defs>
        <radialGradient id={`${id}-sea`} cx="38%" cy="32%" r="75%">
          <stop
            offset="0%"
            stopColor="color-mix(in srgb, var(--violet) 30%, var(--canvas-raised))"
          />
          <stop
            offset="100%"
            stopColor="color-mix(in srgb, var(--violet) 8%, var(--canvas-raised))"
          />
        </radialGradient>
      </defs>
      <circle cx={C} cy={C} r={R} fill={`url(#${id}-sea)`} />
      <g fill="none" stroke="var(--violet)" strokeWidth={0.6} opacity={0.45}>
        {meridians.map((d, i) => (
          <path key={`m${i}`} d={d} />
        ))}
        {parallels.map((d, i) => (
          <path key={`p${i}`} d={d} strokeWidth={i === 2 ? 1 : 0.6} />
        ))}
      </g>
      <circle
        cx={C}
        cy={C}
        r={R}
        fill="none"
        stroke="var(--violet)"
        strokeWidth={1.2}
        opacity={0.7}
      />

      {/* The pin, with a ring that keeps pulsing out from the spot. */}
      <g transform={`translate(${pin.x.toFixed(1)} ${pin.y.toFixed(1)})`} data-part="pin">
        {still ? null : (
          <motion.circle
            r={3}
            fill="none"
            stroke="var(--coral)"
            strokeWidth={1.2}
            initial={{ scale: 1, opacity: 0.9 }}
            animate={{ scale: 4, opacity: 0 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
        <ellipse cx={0} cy={0.5} rx={3} ry={1.2} fill="#1b1633" opacity={0.3} />
        <path
          d="M0 0 C-1.5 -3 -5 -6 -5 -10 a5 5 0 0 1 10 0 C5 -6 1.5 -3 0 0z"
          fill="var(--coral)"
          stroke="#1b1633"
          strokeWidth={0.6}
        />
        <circle cx={0} cy={-10} r={1.9} fill="#fbf9ff" />
      </g>
    </svg>
  );
}
