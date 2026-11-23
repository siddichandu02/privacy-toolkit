import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useStillMotion } from '../../useStillMotion';
import { formatBytes } from '../drop/validate';
import { CompareSlider } from '../ui/CompareSlider';
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
        <CompareSlider
          before={before?.url ?? null}
          after={after?.url ?? null}
          beforeAlt="Sample picture: an evening sky with stars over folded paper hills, original"
          accent="mint"
          testId="demo"
        />
      </div>
    </section>
  );
}
