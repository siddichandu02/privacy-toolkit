import { motion } from 'framer-motion';
import { useStillMotion } from '../../../useStillMotion';
import { Pip } from '../../pip/Pip';
import type { Accent } from '../../ui/accent';

export interface ScrapbookSceneProps {
  /** Overall progress, 0 to 1. A photo gets pinned in as each share passes. */
  progress: number;
  accent?: Accent;
  className?: string;
}

/*
 * Same coordinate space as Pip (left 160 of 300 units, full height). Pip's
 * `hold` paw is at (142, 117); the photo waiting to go in sits just above it.
 */
const W = 300;
const H = 180;
const PAW = { x: 142, y: 117 };
const HELD = { x: 146, y: 96 };
const SPINE = 234;
const BOOK = { top: 104, h: 52, page: 56 };
const DESK_Y = BOOK.top + BOOK.h + 4;
const PHOTO = { w: 22, h: 25 };

/** Where each photo lands: two per page, a little crooked like real scrapbooks. */
const SLOTS = [
  { x: 192, y: 122, r: -7 },
  { x: 214, y: 140, r: 5 },
  { x: 254, y: 121, r: 6 },
  { x: 276, y: 139, r: -4 },
] as const;

/** Little sky, hill and sun scenes so each print looks like a different photo. */
const SHOTS = [
  { sky: 'var(--sky)', hill: 'var(--mint)', sun: 'var(--sunshine)' },
  { sky: 'var(--coral)', hill: 'var(--violet)', sun: 'var(--sunshine)' },
  { sky: 'var(--sunshine)', hill: 'var(--coral)', sun: '#fbf9ff' },
  { sky: 'var(--violet)', hill: 'var(--sky)', sun: 'var(--sunshine)' },
] as const;

const INK = '#1b1633';

/** A white-bordered print drawn around its own centre, with a pin on top. */
function Photo({ i, pinned }: { i: number; pinned: boolean }) {
  const { w, h } = PHOTO;
  const shot = SHOTS[i % SHOTS.length] ?? SHOTS[0];
  const x = -w / 2;
  const y = -h / 2;
  const iw = w - 4;
  const ih = h - 9;
  return (
    <>
      <rect x={x + 0.8} y={y + 1.2} width={w} height={h} rx={1.5} fill={INK} opacity={0.18} />
      <rect x={x} y={y} width={w} height={h} rx={1.5} fill="#fbf9ff" />
      <rect x={x + 2} y={y + 2} width={iw} height={ih} fill={shot.sky} opacity={0.85} />
      <circle cx={x + iw - 2} cy={y + 6} r={2.4} fill={shot.sun} />
      <path
        d={`M${x + 2} ${y + 2 + ih} L${x + 2} ${y + 2 + ih * 0.6} Q${x + 8} ${y + ih * 0.3} ${x + 13} ${y + 2 + ih * 0.65} T${x + 2 + iw} ${y + ih * 0.55} V${y + 2 + ih} Z`}
        fill={shot.hill}
      />
      {pinned ? (
        <g data-part="pin">
          <circle cx={0} cy={y + 1} r={2.6} fill="var(--coral)" stroke={INK} strokeWidth={0.6} />
          <circle cx={-0.8} cy={y + 0.2} r={0.8} fill="#fbf9ff" opacity={0.8} />
        </g>
      ) : null}
    </>
  );
}

/**
 * Images to PDF story: Pip pins photos into an open scrapbook one by one as
 * real progress moves, then the book claps shut. Only the waiting photo's
 * bob loops. With reduced motion everything stands still.
 */
export function ScrapbookScene({ progress, accent = 'mint', className = '' }: ScrapbookSceneProps) {
  const still = useStillMotion();
  const total = SLOTS.length;
  const p = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  const pinned = Math.min(total, Math.floor(p * total + 1e-9));
  const closed = pinned >= total;
  const pip = accent === 'coral' ? 'violet' : 'coral';
  const spring = still ? { duration: 0 } : { type: 'spring' as const, stiffness: 170, damping: 16 };
  const cover = `color-mix(in srgb, var(--${accent}) 78%, #1b1033)`;
  const coverLight = `color-mix(in srgb, var(--${accent}) 70%, white)`;
  const leaf = `color-mix(in srgb, var(--${accent}) 10%, #fbf9ff)`;
  const fold = { originX: `${SPINE}px`, transformBox: 'view-box' as const };

  return (
    <div
      className={`relative h-full ${className}`}
      style={{ aspectRatio: `${W} / ${H}` }}
      data-testid="scrapbook-scene"
      data-pinned={pinned}
      data-closed={closed}
    >
      <Pip
        pose={closed ? 'celebrate' : 'hold'}
        accent={pip}
        className="absolute top-0 left-0 h-full"
      />
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
        overflow="visible"
      >
        {/* Desk */}
        <rect x={168} y={DESK_Y} width={128} height={7} rx={3} fill="#4b4466" />
        <rect x={168} y={DESK_Y} width={128} height={2.4} rx={1.2} fill="#6c6590" />

        {/* Back cover peeking out under the open pages. */}
        <rect
          x={SPINE - BOOK.page - 3}
          y={BOOK.top - 2}
          width={BOOK.page * 2 + 6}
          height={BOOK.h + 5}
          rx={3}
          fill={cover}
        />

        {/* Left page and its photos fold over onto the right when done. */}
        <motion.g
          data-part="left-page"
          style={fold}
          initial={false}
          animate={{ scaleX: closed ? 0 : 1 }}
          transition={still ? { duration: 0 } : { duration: 0.32, ease: 'easeIn' }}
        >
          <rect
            x={SPINE - BOOK.page}
            y={BOOK.top}
            width={BOOK.page}
            height={BOOK.h}
            rx={2}
            fill={leaf}
          />
          <rect x={SPINE - 5} y={BOOK.top} width={5} height={BOOK.h} fill={INK} opacity={0.08} />
        </motion.g>
        <rect x={SPINE} y={BOOK.top} width={BOOK.page} height={BOOK.h} rx={2} fill={leaf} />
        <rect x={SPINE} y={BOOK.top} width={5} height={BOOK.h} fill={INK} opacity={0.08} />

        {/* Photos already pinned. They fly from Pip's paw to their slot. */}
        {SLOTS.slice(0, pinned).map((slot, i) => (
          <motion.g
            key={i}
            data-part="photo-pinned"
            initial={still ? false : { x: HELD.x, y: HELD.y, rotate: -14, scale: 1.1 }}
            animate={{ x: slot.x, y: slot.y, rotate: slot.r, scale: 1, opacity: closed ? 0 : 1 }}
            transition={
              closed && !still ? { opacity: { duration: 0.15 }, default: spring } : spring
            }
          >
            <Photo i={i} pinned />
          </motion.g>
        ))}

        {/* Front cover swings over from the spine and shuts the book. */}
        {closed ? (
          <motion.g
            data-part="cover"
            style={fold}
            initial={still ? false : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={
              still ? { duration: 0 } : { delay: 0.3, type: 'spring', stiffness: 260, damping: 18 }
            }
          >
            <rect
              x={SPINE}
              y={BOOK.top - 2}
              width={BOOK.page + 3}
              height={BOOK.h + 5}
              rx={3}
              fill={cover}
            />
            <rect
              x={SPINE}
              y={BOOK.top - 2}
              width={4}
              height={BOOK.h + 5}
              fill={INK}
              opacity={0.25}
            />
            <rect
              x={SPINE + 14}
              y={BOOK.top + 12}
              width={32}
              height={22}
              rx={2}
              fill={coverLight}
            />
            <path
              d={`M${SPINE + 30} ${BOOK.top + 28} c-6 -4 -7 -9 -3 -10 c2 -0.6 3 1 3 2 c0 -1 1 -2.6 3 -2 c4 1 3 6 -3 10z`}
              fill="var(--coral)"
            />
          </motion.g>
        ) : null}

        {/* The next photo, held up and bobbing until it is its turn. */}
        {!closed ? (
          <motion.g
            key={`held-${pinned}`}
            data-part="photo-held"
            data-bobbing={!still}
            initial={still ? false : { x: PAW.x, y: PAW.y, scale: 0.3, rotate: 0 }}
            animate={
              still
                ? { x: HELD.x, y: HELD.y, scale: 1, rotate: -14 }
                : { x: HELD.x, y: [HELD.y, HELD.y - 4, HELD.y], scale: 1, rotate: [-14, -8, -14] }
            }
            transition={
              still
                ? { duration: 0 }
                : {
                    x: spring,
                    scale: spring,
                    y: { duration: 1.2, ease: 'easeInOut', repeat: Infinity },
                    rotate: { duration: 1.2, ease: 'easeInOut', repeat: Infinity },
                  }
            }
          >
            <Photo i={pinned} pinned={false} />
          </motion.g>
        ) : null}
      </svg>
    </div>
  );
}
