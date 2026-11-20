import { motion } from 'framer-motion';
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { clampPlacement, type Placement } from '../../lib/pdf/sign';
import { useStillMotion } from '../../useStillMotion';
import type { PdfPages } from '../drop/preview';
import type { Accent } from '../ui/accent';

const RENDER_WIDTH = 520;
/** US Letter until the page has drawn and told us its real shape. */
const LETTER = 612 / 792;

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

const pct = (n: number) => `${Math.round(n * 100)}%`;

/**
 * A page with the signature on top. Drag the signature to move it, drag its
 * corner to resize, or tap anywhere on the page to drop it there. With the
 * keyboard: arrow keys move it (Shift for bigger steps), + and - resize.
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
  const sheet = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const [image, setImage] = useState<{ page: number; url: string | null }>({ page: -1, url: null });
  const [shape, setShape] = useState(LETTER);
  const [dragging, setDragging] = useState<'move' | 'size' | null>(null);
  const [said, setSaid] = useState('');
  const grab = useRef<{ x: number; y: number; from: Placement } | null>(null);

  useEffect(() => {
    let alive = true;
    let made: string | null = null;
    pages.render(page + 1, RENDER_WIDTH).then(
      (url) => {
        made = url;
        if (alive) setImage({ page, url });
        else if (url) URL.revokeObjectURL(url);
      },
      () => {
        if (alive) setImage({ page, url: null });
      },
    );
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [pages, page]);

  const fit = (p: Placement) => clampPlacement(p, aspect, shape);
  const shown = fit(place);
  const ready = image.page === page && image.url;

  const size = () =>
    sheet.current?.getBoundingClientRect() ?? { width: 1, height: 1, left: 0, top: 0 };

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
    const r = size();
    const dx = (e.clientX - g.x) / r.width;
    const dy = (e.clientY - g.y) / r.height;
    onPlaceChange(
      fit(
        dragging === 'move'
          ? { ...g.from, x: g.from.x + dx, y: g.from.y + dy }
          : { ...g.from, w: g.from.w + dx },
      ),
    );
  };
  const end = () => {
    if (!grab.current) return;
    grab.current = null;
    setDragging(null);
    setSaid(describe(shown));
  };

  const dropAt = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || e.target !== e.currentTarget) return;
    const r = size();
    const hFrac = shown.w * aspect * shape;
    const next = fit({
      ...shown,
      x: (e.clientX - r.left) / r.width - shown.w / 2,
      y: (e.clientY - r.top) / r.height - hFrac / 2,
    });
    onPlaceChange(next);
    setSaid(describe(next));
  };

  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 0.05 : 0.01;
    const moves: Record<string, Partial<Placement>> = {
      ArrowLeft: { x: shown.x - step },
      ArrowRight: { x: shown.x + step },
      ArrowUp: { y: shown.y - step },
      ArrowDown: { y: shown.y + step },
      '+': { w: shown.w + step },
      '=': { w: shown.w + step },
      '-': { w: shown.w - step },
      _: { w: shown.w - step },
    };
    const change = moves[e.key];
    if (!change) return;
    e.preventDefault();
    const next = fit({ ...shown, ...change });
    onPlaceChange(next);
    setSaid(describe(next));
  };

  return (
    <div className="flex flex-col items-center">
      <div
        ref={sheet}
        data-testid="sign-sheet"
        onPointerDown={dropAt}
        className="relative w-full max-w-[22rem] cursor-copy overflow-hidden rounded-md bg-white shadow-[0_24px_50px_-28px_rgba(20,10,60,0.6),0_2px_8px_rgba(20,10,60,0.14)] ring-1 ring-black/5"
        style={{ aspectRatio: String(shape) }}
      >
        {ready ? (
          <img
            src={image.url ?? undefined}
            alt=""
            draggable={false}
            onLoad={(e) => {
              const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
              if (w && h) setShape(w / h);
            }}
            className="pointer-events-none size-full object-contain select-none"
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
          data-x={shown.x.toFixed(3)}
          data-y={shown.y.toFixed(3)}
          data-w={shown.w.toFixed(3)}
          onPointerDown={(e) => begin('move', e)}
          onPointerMove={follow}
          onPointerUp={end}
          onPointerCancel={end}
          onKeyDown={onKey}
          className="group absolute cursor-grab touch-none rounded-md outline-none active:cursor-grabbing"
          style={
            {
              left: pct(shown.x),
              top: pct(shown.y),
              width: `${shown.w * 100}%`,
              '--pick': `var(--${accent})`,
            } as CSSProperties
          }
          initial={still ? false : { opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: dragging === 'move' && !still ? 1.04 : 1 }}
          transition={still ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 26 }}
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
      <p id={hintId} className="mt-3 max-w-[22rem] text-center text-xs text-muted">
        Drag to move, pull the corner to resize, or tap the page to drop it there. Keyboard: arrow
        keys move, + and − resize.
      </p>
      <p className="sr-only" aria-live="polite">
        {said}
      </p>
    </div>
  );
}

function describe(p: Placement) {
  return `Signature ${pct(p.x)} from the left, ${pct(p.y)} from the top, ${pct(p.w)} of the page wide.`;
}
