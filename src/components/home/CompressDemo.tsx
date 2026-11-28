import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import { prefetchTool } from '../../routes/toolLoaders';
import { toolPath } from '../../tools';
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

/** Run once the browser has a quiet moment (a short timeout where there is no idle callback). */
function whenIdle(run: () => void): () => void {
  const { requestIdleCallback: ask, cancelIdleCallback: cancel } = globalThis;
  if (typeof ask === 'function' && typeof cancel === 'function') {
    const id = ask(run, { timeout: 1500 });
    return () => cancel(id);
  }
  const id = setTimeout(run, 200);
  return () => clearTimeout(id);
}

/**
 * The sample canvas. Null where the browser has no canvas (tests, very old
 * browsers). Painting is the slow part, so it waits until the section is close
 * to the screen and the page is idle: `painted` turns true once it is done.
 */
function useSample(section: RefObject<HTMLElement | null>) {
  const [canvas, setCanvas] = useState(() => {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = SCENE_WIDTH;
    c.height = SCENE_HEIGHT;
    try {
      return c.getContext('2d') ? c : null;
    } catch {
      return null;
    }
  });
  const [painted, setPainted] = useState(false);

  useEffect(() => {
    const el = section.current;
    if (!canvas || !el) return;
    let cancelIdle = () => {};
    const paint = () => {
      cancelIdle = whenIdle(() => {
        try {
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('no canvas');
          paintScene(ctx);
          setPainted(true);
        } catch {
          setCanvas(null);
        }
      });
    };
    if (typeof IntersectionObserver === 'undefined') {
      paint();
      return () => cancelIdle();
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        paint();
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelIdle();
    };
  }, [canvas, section]);

  return { canvas, painted };
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
  const section = useRef<HTMLElement>(null);
  const { canvas, painted } = useSample(section);
  const still = useStillMotion();
  const [level, setLevel] = useState<Level>('balanced');
  const ready = painted ? canvas : null;
  const before = useEncoded(ready, 'image/png');
  const after = useEncoded(ready, 'image/jpeg', QUALITY[level]);

  if (!canvas) return null;

  const saved =
    before && after ? Math.max(0, Math.round((1 - after.bytes / before.bytes) * 100)) : null;

  return (
    <section ref={section} aria-labelledby="demo-heading" className={className}>
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
          <Link
            to={toolPath('compress-image')}
            onMouseEnter={() => prefetchTool('compress-image')}
            onFocus={() => prefetchTool('compress-image')}
            className="group/own mt-5 inline-flex items-center gap-2.5 rounded-full border border-mint/35 bg-mint/10 py-2 pr-4 pl-2 font-semibold text-mint transition-[background-color,border-color,transform] duration-200 hover:border-mint/60 hover:bg-mint/15 active:scale-[0.97] motion-reduce:transition-none"
          >
            <span className="grid size-8 place-items-center rounded-full bg-mint text-on-accent transition-transform duration-300 group-hover/own:-rotate-6 motion-reduce:transition-none">
              <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true">
                <rect
                  x="2.5"
                  y="4"
                  width="15"
                  height="12"
                  rx="2.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="m4.5 14 4-4.5 3 3 2-2 2.5 3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <circle cx="13.5" cy="7.5" r="1.3" fill="currentColor" />
              </svg>
            </span>
            Compress your own photos
          </Link>
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
