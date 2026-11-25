import { animate, motion, type AnimationPlaybackControls } from 'framer-motion';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { clampPlacement, type Placement } from '../../lib/pdf/signature-place';
import { useStillMotion } from '../../useStillMotion';
import type { PdfPages } from '../drop/preview';
import type { Accent } from '../ui/accent';
import { Loupe } from './Loupe';
import { ZoomBar } from './ZoomBar';
import {
  PT_TO_PX,
  anchorScroll,
  clampZoom,
  contentSize,
  fitZoom,
  pageOffset,
  renderWidth,
  stepZoom,
  type FitMode,
  type Size,
} from './zoom';

/** US Letter at real size until the page tells us its own. */
const LETTER: Size = { width: 612 * PT_TO_PX, height: 792 * PT_TO_PX };
/** Used before the viewer has been measured (and in tests). */
const FALLBACK_VIEW: Size = { width: 360, height: 480 };
/** How far a press has to move before it pans instead of dropping the signature. */
const PAN_SLOP = 5;

export interface SignaturePlacerProps {
  pages: PdfPages;
  /** 0-based page shown. */
  page: number;
  /** Object URL of the signature PNG. */
  signatureUrl: string;
  /** Signature height divided by width. */
  aspect: number;
  place: Placement;
  onPlaceChange: (place: Placement) => void;
  accent: Accent;
}

type Gesture =
  | { kind: 'press'; x: number; y: number; left: number; top: number; moved: boolean }
  | { kind: 'pinch'; dist: number; zoom: number; px: number; py: number };

interface Point {
  x: number;
  y: number;
}

const pct = (n: number) => `${n * 100}%`;

/**
 * A page with the signature on top, in a viewer that zooms from 25% to 400%.
 * Drag the signature to move it, drag its corner to resize, or tap the page to
 * drop it there. Zoom with the buttons, Ctrl/Cmd + wheel, Ctrl/Cmd + = and -,
 * or a pinch; drag the page (or scroll) to look around. The placement is kept
 * as fractions of the page, so zoom never changes where the signature lands.
 */
export function SignaturePlacer({
  pages,
  page,
  signatureUrl,
  aspect,
  place,
  onPlaceChange,
  accent,
}: SignaturePlacerProps) {
  const still = useStillMotion();
  const view = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const hintId = useId();

  const [pageSize, setPageSize] = useState<{ page: number; size: Size }>({
    page: -1,
    size: LETTER,
  });
  const [viewSize, setViewSize] = useState<Size>(FALLBACK_VIEW);
  const [zoom, setZoom] = useState(() => fitZoom(FALLBACK_VIEW, LETTER, 'page'));
  const [fit, setFit] = useState<FitMode | null>('page');
  const [image, setImage] = useState<{ page: number; url: string | null; width: number }>({
    page: -1,
    url: null,
    width: 0,
  });
  const [dragging, setDragging] = useState<'move' | 'size' | null>(null);
  const [lens, setLens] = useState<{
    at: Point;
    focus: Point;
    width: number;
  } | null>(null);
  const [panning, setPanning] = useState(false);
  const [said, setSaid] = useState('');

  const zoomRef = useRef(zoom);
  /** Where the zoom is heading, so quick clicks step on from the last target. */
  const target = useRef(zoom);
  const pending = useRef<{ left: number; top: number } | null>(null);
  const spring = useRef<AnimationPlaybackControls | null>(null);
  const grab = useRef<{ x: number; y: number; from: Placement } | null>(null);
  const touches = useRef(new Map<number, Point>());
  const gesture = useRef<Gesture | null>(null);

  const size = pageSize.size;
  const shape = size.width / size.height;
  const fitted = (p: Placement) => clampPlacement(p, aspect, shape);
  const shown = fitted(place);
  const pw = size.width * zoom;
  const ph = size.height * zoom;
  const offX = pageOffset(viewSize.width, pw);
  const offY = pageOffset(viewSize.height, ph);

  // The page's real size, so 100% means real size and the shape is right.
  useEffect(() => {
    let alive = true;
    const ask = pages.size?.(page + 1);
    if (!ask) return;
    ask.then(
      (s) => {
        if (alive && s.width > 0 && s.height > 0) {
          setPageSize({ page, size: { width: s.width * PT_TO_PX, height: s.height * PT_TO_PX } });
        }
      },
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, [pages, page]);

  // Measure the viewer.
  useEffect(() => {
    const el = view.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const watch = new ResizeObserver(() => {
      const { clientWidth: width, clientHeight: height } = el;
      if (width > 0 && height > 0) setViewSize({ width, height });
    });
    watch.observe(el);
    return () => watch.disconnect();
  }, []);

  // A fit mode follows the viewer and the page as they change.
  useEffect(() => {
    if (!fit) return;
    const z = fitZoom(viewSize, size, fit);
    if (Math.abs(z - zoomRef.current) < 0.001) return;
    zoomRef.current = z;
    target.current = z;
    pending.current = { left: 0, top: 0 };
    setZoom(z);
  }, [fit, viewSize, size]);

  useLayoutEffect(() => {
    const el = view.current;
    const to = pending.current;
    if (!el || !to) return;
    pending.current = null;
    el.scrollLeft = to.left;
    el.scrollTop = to.top;
  }, [zoom]);

  useEffect(() => () => spring.current?.stop(), []);

  // Draw the page sharply for the zoom it is shown at. The last drawing stays
  // up (stretched) until the new one is ready, so zooming never flashes.
  const want = renderWidth(pw);
  const samePage = image.page === page;
  const enough = samePage && image.width >= want;
  useEffect(() => {
    if (enough) return;
    let alive = true;
    const timer = setTimeout(
      () => {
        pages.render(page + 1, want).then(
          (url) => {
            if (alive) setImage({ page, url, width: want });
            else if (url) URL.revokeObjectURL(url);
          },
          () => {
            if (alive && !samePage) setImage({ page, url: null, width: want });
          },
        );
      },
      samePage ? 180 : 0,
    );
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [pages, page, want, enough, samePage]);

  useEffect(() => {
    const url = image.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [image.url]);

  /** Zoom now, keeping the page point under `anchor` (viewer coordinates) still. */
  const zoomAt = useCallback(
    (next: number, anchor?: Point) => {
      const el = view.current;
      const z0 = zoomRef.current;
      const z1 = clampZoom(next);
      const vw = el?.clientWidth || viewSize.width;
      const vh = el?.clientHeight || viewSize.height;
      const a = anchor ?? { x: vw / 2, y: vh / 2 };
      pending.current = {
        left: anchorScroll({
          scroll: el?.scrollLeft ?? 0,
          anchor: a.x,
          view: vw,
          page: size.width,
          z0,
          z1,
        }),
        top: anchorScroll({
          scroll: el?.scrollTop ?? 0,
          anchor: a.y,
          view: vh,
          page: size.height,
          z0,
          z1,
        }),
      };
      zoomRef.current = z1;
      setZoom(z1);
    },
    [size, viewSize],
  );

  /** Spring to a zoom (instant with reduced motion). */
  const glideTo = useCallback(
    (goal: number, anchor?: Point) => {
      spring.current?.stop();
      const to = clampZoom(goal);
      target.current = to;
      if (still) {
        zoomAt(to, anchor);
        return;
      }
      spring.current = animate(zoomRef.current, to, {
        type: 'spring',
        stiffness: 360,
        damping: 34,
        restDelta: 0.0005,
        onUpdate: (z) => zoomAt(z, anchor),
      });
    },
    [still, zoomAt],
  );

  const zoomBy = (dir: 1 | -1) => {
    setFit(null);
    glideTo(stepZoom(target.current, dir));
  };
  const fitTo = (mode: FitMode) => {
    spring.current?.stop();
    const goal = fitZoom(viewSize, size, mode);
    target.current = goal;
    if (still || Math.abs(goal - zoomRef.current) < 0.002) {
      setFit(mode);
      return;
    }
    spring.current = animate(zoomRef.current, goal, {
      type: 'spring',
      stiffness: 360,
      damping: 34,
      restDelta: 0.0005,
      onUpdate: (z) => zoomAt(z),
      onComplete: () => setFit(mode),
    });
  };
  const actualSize = () => {
    setFit(null);
    glideTo(1);
  };

  // Ctrl/Cmd + wheel (and trackpad pinch, which arrives as one) zooms at the cursor.
  useEffect(() => {
    const el = view.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      spring.current?.stop();
      const r = el.getBoundingClientRect();
      const lines = e.deltaMode === 1 ? 16 : 1;
      const dy = Math.max(-50, Math.min(50, e.deltaY * lines));
      setFit(null);
      target.current = clampZoom(zoomRef.current * Math.exp(-dy * 0.006));
      zoomAt(target.current, {
        x: e.clientX - r.left,
        y: e.clientY - r.top,
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const sheetRect = () =>
    sheet.current?.getBoundingClientRect() ?? { width: 1, height: 1, left: 0, top: 0 };

  // ---- the signature: drag, resize -------------------------------------------------

  const begin = (kind: 'move' | 'size', e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    grab.current = { x: e.clientX, y: e.clientY, from: shown };
    setDragging(kind);
  };
  const follow = (e: React.PointerEvent<HTMLElement>) => {
    const g = grab.current;
    if (!g || !dragging) return;
    e.stopPropagation();
    const r = sheetRect();
    const dx = (e.clientX - g.x) / r.width;
    const dy = (e.clientY - g.y) / r.height;
    onPlaceChange(
      fitted(
        dragging === 'move'
          ? { ...g.from, x: g.from.x + dx, y: g.from.y + dy }
          : { ...g.from, w: g.from.w + dx },
      ),
    );
    const f = frame.current?.getBoundingClientRect();
    if (f) {
      setLens({
        at: { x: e.clientX - f.left, y: e.clientY - f.top },
        // The page point under the pointer, which the signature follows.
        focus: { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height },
        width: f.width,
      });
    }
  };
  const end = (e: React.PointerEvent<HTMLElement>) => {
    e.stopPropagation();
    if (!grab.current) return;
    grab.current = null;
    setDragging(null);
    setLens(null);
    setSaid(describe(shown));
  };

  const dropAt = (clientX: number, clientY: number) => {
    const r = sheetRect();
    const x = (clientX - r.left) / r.width;
    const y = (clientY - r.top) / r.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    const hFrac = shown.w * aspect * shape;
    const next = fitted({ ...shown, x: x - shown.w / 2, y: y - hFrac / 2 });
    onPlaceChange(next);
    setSaid(describe(next));
  };

  // ---- the viewer: pan, pinch, tap to drop -----------------------------------------

  const local = (p: Point) => {
    const r = view.current?.getBoundingClientRect() ?? { left: 0, top: 0 };
    return { x: p.x - r.left, y: p.y - r.top };
  };
  const startPinch = () => {
    const el = view.current;
    const [a, b] = [...touches.current.values()];
    if (!el || !a || !b) return;
    const mid = local({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    const z = zoomRef.current;
    gesture.current = {
      kind: 'pinch',
      dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
      zoom: z,
      // The page point under the fingers, in zoom-1 pixels.
      px: (el.scrollLeft + mid.x - pageOffset(el.clientWidth, size.width * z)) / z,
      py: (el.scrollTop + mid.y - pageOffset(el.clientHeight, size.height * z)) / z,
    };
  };

  const onViewDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const el = view.current;
    if (!el) return;
    spring.current?.stop();
    touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic events in tests have no live pointer.
    }
    if (touches.current.size >= 2) {
      startPinch();
      return;
    }
    gesture.current = {
      kind: 'press',
      x: e.clientX,
      y: e.clientY,
      left: el.scrollLeft,
      top: el.scrollTop,
      moved: false,
    };
  };

  const onViewMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!touches.current.has(e.pointerId)) return;
    touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const el = view.current;
    const g = gesture.current;
    if (!el || !g) return;
    if (g.kind === 'press') {
      const dx = e.clientX - g.x;
      const dy = e.clientY - g.y;
      if (!g.moved && Math.hypot(dx, dy) < PAN_SLOP) return;
      if (!g.moved) {
        g.moved = true;
        setPanning(true);
      }
      el.scrollLeft = g.left - dx;
      el.scrollTop = g.top - dy;
      return;
    }
    const [a, b] = [...touches.current.values()];
    if (!a || !b) return;
    const mid = local({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    const z1 = clampZoom((g.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / g.dist);
    const vw = el.clientWidth;
    const vh = el.clientHeight;
    const maxL = contentSize(vw, size.width * z1) - vw;
    const maxT = contentSize(vh, size.height * z1) - vh;
    pending.current = {
      left: Math.min(maxL, Math.max(0, g.px * z1 + pageOffset(vw, size.width * z1) - mid.x)),
      top: Math.min(maxT, Math.max(0, g.py * z1 + pageOffset(vh, size.height * z1) - mid.y)),
    };
    setFit(null);
    zoomRef.current = z1;
    target.current = z1;
    setZoom(z1);
  };

  const onViewUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!touches.current.delete(e.pointerId)) return;
    const g = gesture.current;
    const el = view.current;
    if (g?.kind === 'press' && !g.moved && e.type === 'pointerup') dropAt(e.clientX, e.clientY);
    if (g?.kind === 'pinch' && touches.current.size === 1 && el) {
      // One finger left: carry on panning with it.
      const [rest] = [...touches.current.values()];
      if (rest) {
        gesture.current = {
          kind: 'press',
          x: rest.x,
          y: rest.y,
          left: el.scrollLeft,
          top: el.scrollTop,
          moved: true,
        };
        return;
      }
    }
    if (touches.current.size === 0) {
      gesture.current = null;
      setPanning(false);
    }
  };

  // ---- keyboard --------------------------------------------------------------------

  const onSignatureKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    // Arrow keys nudge by one screen pixel (ten with Shift), so zooming in
    // gives finer steps.
    const px = e.shiftKey ? 10 : 1;
    const sx = px / Math.max(1, pw);
    const sy = px / Math.max(1, ph);
    const grow = e.shiftKey ? 0.05 : 0.01;
    const moves: Record<string, Partial<Placement>> = {
      ArrowLeft: { x: shown.x - sx },
      ArrowRight: { x: shown.x + sx },
      ArrowUp: { y: shown.y - sy },
      ArrowDown: { y: shown.y + sy },
      '+': { w: shown.w + grow },
      '=': { w: shown.w + grow },
      '-': { w: shown.w - grow },
      _: { w: shown.w - grow },
    };
    const change = moves[e.key];
    if (!change) return;
    e.preventDefault();
    e.stopPropagation();
    const next = fitted({ ...shown, ...change });
    onPlaceChange(next);
    setSaid(describe(next));
  };

  const onZoomKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    if (e.key === '=' || e.key === '+') zoomBy(1);
    else if (e.key === '-' || e.key === '_') zoomBy(-1);
    else if (e.key === '0') fitTo('page');
    else return;
    e.preventDefault();
  };

  const ready = samePage && image.url;
  const pannable = pw + 32 > viewSize.width + 1 || ph + 32 > viewSize.height + 1;

  return (
    <div className="flex w-full flex-col items-center" onKeyDown={onZoomKey}>
      <ZoomBar
        zoom={zoom}
        fit={fit}
        accent={accent}
        onZoomIn={() => zoomBy(1)}
        onZoomOut={() => zoomBy(-1)}
        onFit={fitTo}
        onActualSize={actualSize}
      />
      <div ref={frame} className="relative w-full">
        <div
          ref={view}
          role="region"
          // A focusable region so arrow keys and Page Up/Down scroll it.
          tabIndex={0}
          aria-label={`Page ${page + 1}. Scroll or drag to look around.`}
          data-testid="sign-view"
          data-zoom={zoom.toFixed(3)}
          onPointerDown={onViewDown}
          onPointerMove={onViewMove}
          onPointerUp={onViewUp}
          onPointerCancel={onViewUp}
          className={`sign-desk max-h-[min(70vh,40rem)] w-full overflow-auto overscroll-contain rounded-2xl border border-line ${
            panning ? 'cursor-grabbing' : pannable ? 'cursor-grab' : 'cursor-copy'
          }`}
          style={{
            touchAction: pannable ? 'none' : 'pan-y',
            // As tall as the page needs at this width, up to most of the screen.
            aspectRatio: `${size.width + 32} / ${size.height + 32}`,
          }}
        >
          <div
            className="relative"
            style={{
              width: contentSize(viewSize.width, pw),
              height: contentSize(viewSize.height, ph),
            }}
          >
            <div
              ref={sheet}
              data-testid="sign-sheet"
              className="absolute overflow-hidden rounded-[3px] bg-white shadow-[0_24px_50px_-28px_rgba(20,10,60,0.6),0_2px_8px_rgba(20,10,60,0.14)] ring-1 ring-black/5"
              style={{ left: offX, top: offY, width: pw, height: ph }}
            >
              {ready ? (
                <img
                  src={image.url ?? undefined}
                  alt=""
                  draggable={false}
                  data-testid="sign-page-image"
                  data-render-width={image.width}
                  className="pointer-events-none size-full select-none"
                />
              ) : (
                <div className="size-full animate-pulse bg-line" />
              )}

              <motion.div
                role="group"
                tabIndex={0}
                aria-roledescription="movable signature"
                aria-label={`Your signature on page ${page + 1}`}
                aria-describedby={hintId}
                data-testid="signature-box"
                data-x={shown.x.toFixed(4)}
                data-y={shown.y.toFixed(4)}
                data-w={shown.w.toFixed(4)}
                onPointerDown={(e) => begin('move', e)}
                onPointerMove={follow}
                onPointerUp={end}
                onPointerCancel={end}
                onKeyDown={onSignatureKey}
                className="group absolute cursor-grab touch-none rounded-md outline-none active:cursor-grabbing"
                style={
                  {
                    left: pct(shown.x),
                    top: pct(shown.y),
                    width: pct(shown.w),
                    '--pick': `var(--${accent})`,
                  } as CSSProperties
                }
                initial={still ? false : { opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: dragging === 'move' && !still ? 1.04 : 1 }}
                transition={
                  still ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 26 }
                }
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute -inset-1.5 rounded-lg border-2 border-dashed border-[var(--pick)] transition-opacity group-hover:opacity-100 group-focus-visible:border-solid group-focus-visible:opacity-100 ${
                    dragging ? 'opacity-100' : 'opacity-70'
                  }`}
                  style={{ background: `color-mix(in srgb, var(--${accent}) 8%, transparent)` }}
                />
                <img
                  src={signatureUrl}
                  alt=""
                  draggable={false}
                  className="pointer-events-none relative block w-full select-none"
                />
                <span
                  role="presentation"
                  data-testid="signature-resize"
                  onPointerDown={(e) => begin('size', e)}
                  onPointerMove={follow}
                  onPointerUp={end}
                  onPointerCancel={end}
                  className="absolute -right-3.5 -bottom-3.5 grid size-7 cursor-nwse-resize touch-none place-items-center"
                >
                  <span className="size-3.5 rounded-full border-2 border-white bg-[var(--pick)] shadow-[0_2px_6px_rgba(20,10,60,0.35)] transition-transform group-hover:scale-110" />
                </span>
              </motion.div>
            </div>
          </div>
        </div>

        {lens && dragging ? (
          <Loupe
            at={lens.at}
            focus={lens.focus}
            frameWidth={lens.width}
            pageUrl={ready ? image.url : null}
            signatureUrl={signatureUrl}
            place={shown}
            page={{ width: pw, height: ph }}
            accent={accent}
          />
        ) : null}
      </div>
      <p id={hintId} className="mt-3 max-w-[30rem] text-center text-xs text-muted">
        Drag to move, pull the corner to resize, or tap the page to drop it there. Zoom with the
        buttons, Ctrl + scroll or a pinch, then drag the page to look around. Arrow keys nudge the
        signature 1 px (Shift for 10), + and − resize.
      </p>
      <p className="sr-only" aria-live="polite">
        {said}
      </p>
    </div>
  );
}

function describe(p: Placement) {
  const r = (n: number) => `${Math.round(n * 100)}%`;
  return `Signature ${r(p.x)} from the left, ${r(p.y)} from the top, ${r(p.w)} of the page wide.`;
}
