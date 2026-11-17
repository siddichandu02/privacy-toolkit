import type { ReactNode } from 'react';

const s = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** A page with a folded top-right corner, the base shape for PDF icons. */
const page = (x: number, y: number, w = 11, h = 14) => (
  <path
    d={`M${x} ${y + 1.5}a1.5 1.5 0 0 1 1.5-1.5H${x + w - 3.5}L${x + w} ${y + 3.5}V${y + h - 1.5}a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 ${x} ${y + h - 1.5}Z`}
    {...s}
  />
);

/** A photo frame with a little hill and sun, the base shape for image icons. */
const photo = (
  <>
    <rect x="3" y="5" width="18" height="14" rx="3" {...s} />
    <path d="m3.5 16.5 4.5-4.5 3.5 3.5 2.5-2.5 6 6" {...s} />
    <circle cx="15.5" cy="9.5" r="1.5" {...s} />
  </>
);

const ICONS: Record<string, ReactNode> = {
  merge: (
    <>
      {page(3, 3, 9, 12)}
      {page(12, 9, 9, 12)}
      <path d="M8 18.5h2.5M13.5 5.5H16" {...s} />
    </>
  ),
  split: (
    <>
      {page(6.5, 3)}
      <path d="M3 12h3M9 12h1.5M14 12h1.5M19 12h2" {...s} />
    </>
  ),
  rotate: (
    <>
      {page(7, 6, 10, 13)}
      <path d="M4 9a8.5 8.5 0 0 1 13-5.5M17 1.5v2.5h-2.5" {...s} />
    </>
  ),
  'images-to-pdf': (
    <>
      <rect x="2.5" y="3" width="11" height="9" rx="2" {...s} />
      <path d="m3 10 3-2.5 2.5 2 2-1.5 3 2.5" {...s} />
      {page(11, 8, 10, 13)}
      <path d="M14 15h4M14 18h2.5" {...s} />
    </>
  ),
  sign: (
    <>
      <path d="M3 19c2.5 0 3-5 5-5s1 4 3 4 2.5-3 4-3 1.5 2 3 2" {...s} />
      <path d="m14 10 6-6.5a1.4 1.4 0 0 1 2 2L16 12l-3 1Z" {...s} />
    </>
  ),
  'compress-pdf': (
    <>
      {page(6.5, 5, 11, 14)}
      <path d="M12 1.5v4m-2-2 2 2 2-2M12 22.5v-4m-2 2 2-2 2 2" {...s} />
    </>
  ),
  'compress-image': (
    <>
      {photo}
      <path d="M1.5 12H4m-1-1 1 1-1 1M22.5 12H20m1-1-1 1 1 1" {...s} />
    </>
  ),
  convert: (
    <>
      <rect x="3" y="3" width="11" height="11" rx="2.5" {...s} />
      <rect x="10" y="10" width="11" height="11" rx="2.5" {...s} />
      <path
        d="M17 3.5a3.5 3.5 0 0 1 3.5 3.5M19 5.5l1.5 1.5L22 5.5M7 20.5A3.5 3.5 0 0 1 3.5 17M5 18.5 3.5 17 2 18.5"
        {...s}
      />
    </>
  ),
  resize: (
    <>
      <path d="M7 2v15h15M2 7h15v15" {...s} />
      <path d="m11 13 3-3" {...s} />
    </>
  ),
  exif: (
    <>
      <path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10Z" {...s} />
      <circle cx="12" cy="11" r="2.2" {...s} />
      <path d="M4 4l16 16" {...s} />
    </>
  ),
};

/** Line icon for a tool, drawn to match the promise strip icons. */
export function ToolIcon({ id, className = '' }: { id: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      {ICONS[id] ?? page(6.5, 5)}
    </svg>
  );
}
