import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState, type CSSProperties } from 'react';
import { useStillMotion } from '../../useStillMotion';
import { formatBytes } from '../drop/validate';
import { Segmented } from '../ui/Segmented';
import { paintScene, SCENE_HEIGHT, SCENE_WIDTH } from './sampleScene';

type Level = 'light' | 'balanced' | 'strong';

const LEVELS = [
  { id: 'light', label: 'Light' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'strong', label: 'Strong' },
] as const;

/** JPEG quality for each level. Strong is pushed far so the change is easy to see. */
const QUALITY: Record<Level, number> = { light: 0.85, balanced: 0.55, strong: 0.12 };

interface Encoded {
  url: string;
  bytes: number;
}

function encode(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Encoded> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve({ url: URL.createObjectURL(blob), bytes: blob.size }) : reject(new Error()),
      type,
      quality,
    );
  });
}

/** Draws the sample once per visit. Null where the browser has no canvas (tests, very old browsers). */
function useSample(): HTMLCanvasElement | null {
  const [canvas] = useState(() => {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = SCENE_WIDTH;
    c.height = SCENE_HEIGHT;
    try {
      const ctx = c.getContext('2d');
      if (!ctx) return null;
      paintScene(ctx);
    } catch {
      return null;
    }
    return c;
  });
  return canvas;
}

/** Keeps one object URL alive and revokes the old one when it changes. */
function useEncoded(
  canvas: HTMLCanvasElement | null,
  type: string,
  quality?: number,
): Encoded | null {
  const [out, setOut] = useState<Encoded | null>(null);
  useEffect(() => {
    if (!canvas) return;
    let alive = true;
    let made: Encoded | null = null;
    encode(canvas, type, quality)
      .then((e) => {
        made = e;
        if (alive) setOut(e);
        else URL.revokeObjectURL(e.url);
      })
      .catch(() => {});
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made.url);
    };
  }, [canvas, type, quality]);
  return out;
}

/**
 * A real compression, live on the home page: the picture is painted in this
 * tab, saved as PNG for the "before" and re-encoded as JPEG at the picked
 * level for the "after". Drag the line (or use the arrow keys) to compare.
 */
export function CompressDemo({ className = '' }: { className?: string }) {
  const canvas = useSample();
  const still = useStillMotion();
  const [level, setLevel] = useState<Level>('balanced');
  const [split, setSplit] = useState(50);
  const before = useEncoded(canvas, 'image/png');
  const after = useEncoded(canvas, 'image/jpeg', QUALITY[level]);

  if (!canvas) return null;

  const saved =
    before && after ? Math.max(0, Math.round((1 - after.bytes / before.bytes) * 100)) : null;

  return (
    <section aria-labelledby="demo-heading" className={className}>
      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-14">
        <div className="min-w-0 lg:order-2">
          <h2
            id="demo-heading"
            className="font-display text-2xl font-bold tracking-tight sm:text-3xl"
          >
            See compression up close
          </h2>
          <p className="mt-3 text-lg leading-relaxed text-muted">
            This picture was drawn in your browser a moment ago. Pick a level and drag the line to
            compare. Strong saves the most space and starts to blur the stars.
          </p>
          <Segmented
            legend="Compression level"
            hideLegend
            options={LEVELS}
            value={level}
            onChange={setLevel}
            accent="mint"
            className="mt-6 max-w-sm"
          />
          <dl className="mt-6 grid max-w-sm grid-cols-2 gap-x-6 gap-y-1">
            <dt className="text-sm text-muted">Original (PNG)</dt>
            <dt className="text-sm text-muted">Compressed (JPG)</dt>
            <dd
              data-testid="demo-before-size"
              className="font-display text-xl font-bold tabular-nums"
            >
              {before ? formatBytes(before.bytes) : '…'}
            </dd>
            <dd
              data-testid="demo-after-size"
              className="font-display text-xl font-bold tabular-nums"
            >
              {after ? formatBytes(after.bytes) : '…'}
            </dd>
          </dl>
          <p
            className="mt-4 h-9 font-display text-3xl font-extrabold tracking-tight text-mint"
            aria-live="polite"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {saved !== null ? (
                <motion.span
                  key={after?.url}
                  data-testid="demo-saved"
                  className="inline-block"
                  initial={still ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={still ? { opacity: 0 } : { opacity: 0, y: -14 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                >
                  {saved}% smaller
                </motion.span>
              ) : null}
            </AnimatePresence>
          </p>
        </div>
        <div
          className="group relative aspect-[16/10] overflow-hidden rounded-panel border border-line bg-canvas-raised shadow-lifted select-none"
          style={{ '--split': `${split}%` } as CSSProperties}
        >
          {before ? (
            <img
              src={before.url}
              alt="Sample picture: an evening sky with stars over folded paper hills, original"
              className="absolute inset-0 size-full object-cover"
              draggable={false}
            />
          ) : null}
          {after ? (
            <img
              src={after.url}
              alt=""
              data-testid="demo-after"
              className="absolute inset-0 size-full object-cover"
              style={{ clipPath: 'inset(0 0 0 var(--split))' }}
              draggable={false}
            />
          ) : null}

          <span className="absolute top-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
            Original
          </span>
          <span className="absolute top-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
            Compressed
          </span>

          {/* The divider and its grip. Purely visual; the range input below does the work. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_12px_rgb(0_0_0/0.45)]"
            style={{ left: 'var(--split)' }}
          >
            <span className="absolute top-1/2 left-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-mint text-on-accent shadow-lifted transition-transform duration-200 group-hover:scale-110 group-active:scale-95 motion-reduce:transition-none">
              <svg
                viewBox="0 0 24 24"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 6l-5 6 5 6M15 6l5 6-5 6" />
              </svg>
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={split}
            onChange={(e) => setSplit(Number(e.target.value))}
            aria-label="Compare original and compressed"
            aria-valuetext={`${split}% original, ${100 - split}% compressed`}
            className="peer absolute inset-0 size-full cursor-ew-resize opacity-0"
          />
          {/* Focus ring for keyboard users, drawn on the frame. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-panel ring-mint peer-focus-visible:ring-3 peer-focus-visible:ring-inset"
          />
        </div>
      </div>
    </section>
  );
}
