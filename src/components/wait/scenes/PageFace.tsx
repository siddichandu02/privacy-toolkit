import type { Accent } from '../../ui/accent';

/**
 * The picture side of a page in a wait scene: the user's own first page when
 * we have it, a few ruled lines otherwise. Draws inside the box it is given,
 * so the caller owns the paper, outline and any transform.
 */
export function PageFace({
  x,
  y,
  w,
  h,
  href,
  accent,
  clip,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  href?: string;
  accent: Accent;
  /** A clipPath id unique on the page. */
  clip: string;
}) {
  if (href) {
    return (
      <>
        <clipPath id={clip}>
          <rect x={x} y={y} width={w} height={h} rx={Math.min(1, w / 8)} />
        </clipPath>
        <image
          data-part="real-page"
          href={href}
          x={x}
          y={y}
          width={w}
          height={h}
          preserveAspectRatio="xMidYMin slice"
          clipPath={`url(#${clip})`}
        />
      </>
    );
  }
  const line = Math.max(1, h / 12);
  return (
    <>
      {[0, 1, 2].map((l) => (
        <rect
          key={l}
          x={x + w * 0.12}
          y={y + h * 0.15 + l * line * 2.6}
          width={w * (l === 2 ? 0.45 : 0.76)}
          height={line}
          rx={line / 2}
          fill={`color-mix(in srgb, var(--${accent}) 35%, #d6cfe8)`}
        />
      ))}
    </>
  );
}
