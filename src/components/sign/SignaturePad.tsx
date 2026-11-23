import '@fontsource/great-vibes/latin-400.css';
import '@fontsource-variable/caveat';
import { AnimatePresence, motion } from 'framer-motion';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { useStillMotion } from '../../useStillMotion';
import type { Accent } from '../ui/accent';
import { Segmented, type SegmentOption } from '../ui/Segmented';
import {
  HANDS,
  INKS,
  drawStrokes,
  handFamily,
  inkColor,
  signatureFromStrokes,
  signatureFromText,
  type HandId,
  type InkId,
  type PadMode,
  type SignatureDraft,
  type Signature,
  type Stroke,
} from './ink';

const MODES: readonly SegmentOption<PadMode>[] = [
  { id: 'draw', label: 'Draw', icon: <PenIcon /> },
  { id: 'type', label: 'Type', icon: <TypeIcon /> },
];

const HAND_OPTIONS: readonly SegmentOption<HandId>[] = HANDS.map((h) => ({
  id: h.id,
  label: h.label,
}));

/** Pen width on the pad, in CSS pixels. */
const PEN = 3;
const PAD_HEIGHT = 'clamp(9rem, 28vw, 12rem)';

export interface SignaturePadProps {
  accent: Accent;
  draft: SignatureDraft;
  onDraftChange: (draft: SignatureDraft) => void;
  /** Called with a fresh signature after every change, or null when the pad is empty. */
  onChange: (signature: Signature | null) => void;
}

/**
 * A paper slip to sign on: draw with a mouse, finger or pen, or type a name
 * in a script face. The signature is rebuilt as a trimmed transparent PNG
 * after every stroke or keystroke, all on the device.
 */
export function SignaturePad({ accent, draft, onDraftChange, onChange }: SignaturePadProps) {
  const { mode, ink, strokes, text, hand } = draft;
  const set = <K extends keyof SignatureDraft>(key: K, value: SignatureDraft[K]) =>
    onDraftChange({ ...draft, [key]: value });
  const setMode = (v: PadMode) => set('mode', v);
  const setInk = (v: InkId) => set('ink', v);
  const setStrokes = (v: Stroke[]) => set('strokes', v);
  const setText = (v: string) => set('text', v);
  const setHand = (v: HandId) => set('hand', v);
  const textId = useId();
  const still = useStillMotion();

  // Keep the latest callback without re-running exports when it changes.
  const report = useRef(onChange);
  useEffect(() => {
    report.current = onChange;
  }, [onChange]);
  const run = useRef(0);
  const padSize = useRef({ width: 0, height: 0 });

  useEffect(() => {
    const id = ++run.current;
    const color = inkColor(ink);
    const make =
      mode === 'draw'
        ? () => signatureFromStrokes(strokes, padSize.current, color, PEN)
        : () => signatureFromText(text, handFamily(hand), color);
    // Typing waits for a pause; strokes are already whole.
    const timer = setTimeout(
      () => {
        make().then(
          (sig) => {
            if (run.current === id) report.current(sig);
          },
          () => {
            if (run.current === id) report.current(null);
          },
        );
      },
      mode === 'type' ? 220 : 0,
    );
    return () => clearTimeout(timer);
  }, [mode, strokes, text, hand, ink]);

  const empty = mode === 'draw' ? strokes.length === 0 : !text.trim();
  const color = inkColor(ink);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Segmented
          legend="How to sign"
          hideLegend
          options={MODES}
          value={mode}
          onChange={setMode}
          accent={accent}
          className="w-full min-[420px]:w-56"
        />
        <fieldset className="flex items-center gap-2">
          <legend className="sr-only">Ink colour</legend>
          {INKS.map((i) => (
            <label
              key={i.id}
              title={i.label}
              className="relative grid size-9 cursor-pointer place-items-center rounded-full has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--pick)]"
              style={{ '--pick': `var(--${accent})` } as CSSProperties}
            >
              <input
                type="radio"
                name={`${textId}-ink`}
                checked={ink === i.id}
                onChange={() => setInk(i.id)}
                aria-label={i.label}
                className="sr-only"
              />
              <span
                className={`block rounded-full ring-2 ring-offset-2 ring-offset-canvas transition-all duration-200 ${
                  ink === i.id ? 'size-7 ring-line-strong' : 'size-5 ring-transparent'
                }`}
                style={{
                  background: i.color,
                  boxShadow:
                    'inset 0 0 0 1.5px rgba(255,255,255,0.28), 0 0 0 1px rgba(127,120,170,0.45)',
                }}
              />
            </label>
          ))}
        </fieldset>
      </div>

      {/* The slip itself stays paper-white in both themes, so ink reads like ink. */}
      <div
        className="relative mt-4 overflow-hidden rounded-2xl bg-[#fbf9ff] shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_18px_40px_-24px_rgba(20,10,60,0.55),0_2px_6px_rgba(20,10,60,0.12)]"
        style={{ height: PAD_HEIGHT }}
      >
        <SlipLines accent={accent} />
        {mode === 'draw' ? (
          <DrawSurface
            strokes={strokes}
            color={color}
            onStrokesChange={setStrokes}
            onResize={(size) => {
              padSize.current = size;
            }}
          />
        ) : (
          <TypedPreview
            text={text}
            color={color}
            family={handFamily(hand)}
            fontSize={
              hand === 'flowing' ? 'clamp(2.4rem, 8vw, 3.6rem)' : 'clamp(2.2rem, 7vw, 3.2rem)'
            }
          />
        )}
        <AnimatePresence>
          {empty ? (
            <motion.p
              key={mode}
              initial={still ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              className="pointer-events-none absolute inset-x-0 top-[34%] text-center text-sm font-medium text-[#6b6590]"
            >
              {mode === 'draw' ? 'Sign here with a mouse, finger or pen' : 'Your name appears here'}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="mt-3 flex min-h-11 flex-wrap items-center justify-between gap-3">
        {mode === 'draw' ? (
          <>
            <p className="text-xs text-muted">
              No mouse or pen to hand? Switch to Type and use your keyboard.
            </p>
            <div className="flex gap-2 text-sm font-semibold">
              <PadButton
                onClick={() => setStrokes(strokes.slice(0, -1))}
                disabled={strokes.length === 0}
              >
                Undo
              </PadButton>
              <PadButton onClick={() => setStrokes([])} disabled={strokes.length === 0}>
                Clear
              </PadButton>
            </div>
          </>
        ) : (
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end">
            <label htmlFor={textId} className="flex-1">
              <span className="mb-2 block text-sm font-semibold text-muted">Your name</span>
              <input
                id={textId}
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={60}
                autoComplete="name"
                placeholder="Alex Morgan"
                className="w-full rounded-2xl border border-line bg-canvas/60 px-4 py-3 text-base text-fg placeholder:text-muted/70 focus-visible:border-line-strong"
              />
            </label>
            <Segmented
              legend="Handwriting"
              options={HAND_OPTIONS}
              value={hand}
              onChange={setHand}
              accent={accent}
              className="sm:w-56"
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** Faint ruling, a dashed signing line and the little cross where you start. */
function SlipLines({ accent }: { accent: Accent }) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 size-full"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <line
        x1="5%"
        x2="95%"
        y1="70%"
        y2="70%"
        stroke={`var(--${accent})`}
        strokeOpacity="0.55"
        strokeWidth="1.5"
        strokeDasharray="6 6"
      />
      <text x="5%" y="70%" dy="-10" fill="#6b6590" fontSize="18" fontWeight="600">
        ×
      </text>
    </svg>
  );
}

interface DrawSurfaceProps {
  strokes: Stroke[];
  color: string;
  onStrokesChange: (strokes: Stroke[]) => void;
  onResize: (size: { width: number; height: number }) => void;
}

function DrawSurface({ strokes, color, onStrokesChange, onResize }: DrawSurfaceProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef<Stroke | null>(null);
  const frame = useRef(0);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const resized = useRef(onResize);
  useEffect(() => {
    resized.current = onResize;
  }, [onResize]);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const next = { width: r.width, height: r.height };
      setSize((s) => (s.width === next.width && s.height === next.height ? s : next));
      resized.current(next);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const paint = useCallback(() => {
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    if (el.width !== Math.round(size.width * dpr)) el.width = Math.round(size.width * dpr);
    if (el.height !== Math.round(size.height * dpr)) el.height = Math.round(size.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);
    drawStrokes(ctx, live.current ? [...strokes, live.current] : strokes, color, PEN);
  }, [strokes, color, size]);

  useEffect(() => {
    paint();
  }, [paint]);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, t: e.timeStamp };
  };
  const schedule = () => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(paint);
  };

  return (
    <canvas
      ref={canvas}
      data-testid="signature-canvas"
      aria-label="Signature drawing area"
      role="img"
      className="absolute inset-0 size-full cursor-crosshair touch-none"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        live.current = [point(e)];
        schedule();
      }}
      onPointerMove={(e) => {
        if (!live.current) return;
        const events = e.nativeEvent.getCoalescedEvents?.() ?? [];
        if (events.length > 1) {
          const r = e.currentTarget.getBoundingClientRect();
          for (const c of events) {
            live.current.push({ x: c.clientX - r.left, y: c.clientY - r.top, t: c.timeStamp });
          }
        } else {
          live.current.push(point(e));
        }
        schedule();
      }}
      onPointerUp={() => {
        const done = live.current;
        live.current = null;
        if (done) onStrokesChange([...strokes, done]);
      }}
      onPointerCancel={() => {
        live.current = null;
        schedule();
      }}
    />
  );
}

function PadButton({
  children,
  onClick,
  disabled,
}: {
  children: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-line px-3.5 py-1.5 text-muted transition-colors hover:border-line-strong hover:text-fg disabled:opacity-40 disabled:hover:border-line disabled:hover:text-muted"
    >
      {children}
    </button>
  );
}

function PenIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
      <path
        d="M2.5 13.5c2-.4 3.2-1.4 4-3m-1.7-.3 6.4-6.4a1.4 1.4 0 0 1 2 2L6.8 12.2 4 13l.8-2.8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TypeIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
      <path
        d="M3 4V3h10v1M8 3v10m-2 0h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The typed name on the slip. Long names shrink to fit the line instead of
 * running off the edge, so what you see is what lands on the page.
 */
function TypedPreview({
  text,
  color,
  family,
  fontSize,
}: {
  text: string;
  color: string;
  family: string;
  fontSize: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const outer = box.current;
    const inner = line.current;
    if (!outer || !inner) return;
    const fit = () => {
      const room = outer.clientWidth - parseFloat(getComputedStyle(outer).paddingLeft || '0');
      const natural = inner.scrollWidth;
      const next = natural > 0 && room > 0 ? Math.min(1, room / natural) : 1;
      setScale((s) => (Math.abs(s - next) < 0.005 ? s : next));
    };
    fit();
    // Script fonts arrive a moment later and are wider than the fallback.
    let live = true;
    void document.fonts?.ready.then(() => {
      if (live) fit();
    });
    if (typeof ResizeObserver === 'undefined') {
      return () => {
        live = false;
      };
    }
    const ro = new ResizeObserver(fit);
    ro.observe(outer);
    return () => {
      live = false;
      ro.disconnect();
    };
  }, [text, family, fontSize]);

  return (
    <div
      ref={box}
      aria-hidden="true"
      data-testid="typed-preview"
      data-scale={scale.toFixed(2)}
      className="absolute inset-x-6 top-0 bottom-[30%] flex items-end overflow-hidden pl-6 whitespace-nowrap"
      style={{ fontFamily: family, color, fontSize, lineHeight: 1.1 }}
    >
      <span
        ref={line}
        className="inline-block origin-bottom-left transition-transform duration-150"
        style={{ transform: scale < 1 ? `scale(${scale})` : undefined }}
      >
        {text}
      </span>
    </div>
  );
}
