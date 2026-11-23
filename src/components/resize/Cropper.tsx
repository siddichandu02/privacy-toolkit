import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { clampView, cropBox, type CropView } from '../../lib/image/resize-names';
import { useStillMotion } from '../../useStillMotion';
import type { Accent } from '../ui/accent';

interface Size {
  width: number;
  height: number;
}

export interface CropperProps {
  url: string | null;
  /** Upright size of the photo, once known. */
  size: Size | null;
  /** Shape of the frame (width / height), or null to show the whole photo uncut. */
  aspect: number | null;
  view: CropView;
  onView: (view: CropView) => void;
  accent: Accent;
  /** Written on the tag at the corner of the frame, e.g. "1080 × 1350". */
  label: string;
  onLoad: (img: HTMLImageElement) => void;
  onError: () => void;
}

const FULL = { x: 0, y: 0, width: 1, height: 1 };

/** Width of the stage, kept up to date as the page resizes. */
function useWidth() {
  const [width, setWidth] = useState(640);
  const observer = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: HTMLDivElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!el) return;
    if (el.clientWidth) setWidth(el.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    observer.current = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.round(entry.contentRect.width));
    });
    observer.current.observe(el);
  }, []);
  return [width, ref] as const;
}

/**
 * The photo under a frame the shape of the chosen size. Drag (or pinch) the
 * photo to choose what stays; arrow keys move it, + and - zoom. Everything
 * outside the frame is dimmed. With no shape the whole photo shows, uncut.
 */
export function Cropper({
  url,
  size,
  aspect,
  view,
  onView,
  accent,
  label,
  onLoad,
  onError,
}: CropperProps) {
  const still = useStillMotion();
  const [stageW, stageRef] = useWidth();
  const [dragging, setDragging] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);

  const pad = stageW < 480 ? 18 : 32;
  const stageH = Math.round(Math.max(240, Math.min(stageW * 0.7, 480)));
  const srcW = size?.width ?? 4;
  const srcH = size?.height ?? 3;
  const frameAspect = aspect ?? srcW / srcH;
  const frameW = Math.max(1, Math.min(stageW - pad * 2, (stageH - pad * 2) * frameAspect));
  const frameH = frameW / frameAspect;
  const frameX = (stageW - frameW) / 2;
  const frameY = (stageH - frameH) / 2;
  const box = aspect ? cropBox(srcW, srcH, aspect, view) : FULL;
  const dispW = frameW / box.width;
  const dispH = frameH / box.height;
  const left = frameX - box.x * dispW;
  const top = frameY - box.y * dispH;
  const movable = Boolean(aspect && size);

  const set = (next: CropView) => {
    if (aspect && size) onView(clampView(srcW, srcH, aspect, next));
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!movable) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      if (a && b) pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: view.zoom };
    }
    setDragging(true);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const last = pointers.current.get(e.pointerId);
    if (!last || !movable) return;
    const now = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, now);
    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      if (a && b && pinch.current.dist > 0) {
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        set({ ...view, zoom: pinch.current.zoom * (dist / pinch.current.dist) });
      }
      return;
    }
    // Dragging the photo right shows more of its left side.
    set({ ...view, x: view.x - (now.x - last.x) / dispW, y: view.y - (now.y - last.y) / dispH });
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) setDragging(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!movable) return;
    const step = (e.shiftKey ? 0.1 : 0.02) * box.width;
    const stepY = (e.shiftKey ? 0.1 : 0.02) * box.height;
    const moves: Record<string, CropView> = {
      ArrowLeft: { ...view, x: view.x - step },
      ArrowRight: { ...view, x: view.x + step },
      ArrowUp: { ...view, y: view.y - stepY },
      ArrowDown: { ...view, y: view.y + stepY },
      '+': { ...view, zoom: view.zoom * 1.15 },
      '=': { ...view, zoom: view.zoom * 1.15 },
      '-': { ...view, zoom: view.zoom / 1.15 },
    };
    const next = moves[e.key];
    if (!next) return;
    e.preventDefault();
    set(next);
  };

  const smooth = !dragging && !still;
  const ink = `var(--${accent})`;

  return (
    <div
      ref={stageRef}
      className="relative w-full overflow-hidden rounded-2xl border border-line bg-[#120f24] select-none"
      style={{ height: stageH, touchAction: movable ? 'none' : undefined }}
      data-testid="cropper"
      data-zoom={view.zoom.toFixed(2)}
      data-box={`${box.x.toFixed(3)},${box.y.toFixed(3)},${box.width.toFixed(3)},${box.height.toFixed(3)}`}
    >
      {/* A cutting-mat grid behind the photo. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(rgb(255 255 255 / 0.07) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.07) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      {url ? (
        <img
          src={url}
          alt=""
          draggable={false}
          onLoad={(e) => onLoad(e.currentTarget)}
          onError={onError}
          className="absolute top-0 left-0 max-w-none"
          style={{
            width: dispW,
            height: dispH,
            transform: `translate(${left}px, ${top}px)`,
            opacity: size ? 1 : 0,
            transition: smooth
              ? 'transform 220ms cubic-bezier(.2,.8,.2,1), width 220ms cubic-bezier(.2,.8,.2,1), height 220ms cubic-bezier(.2,.8,.2,1)'
              : undefined,
          }}
          data-testid="cropper-photo"
        />
      ) : null}

      {/* The frame: everything outside it is dimmed, the edge is a chalked pattern. */}
      <div
        role="group"
        tabIndex={movable ? 0 : -1}
        aria-label={
          movable
            ? `Crop frame, ${label}. Drag the photo or use the arrow keys to choose what stays; plus and minus zoom.`
            : `Whole photo, resized to ${label}.`
        }
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className={`absolute rounded-[2px] outline-offset-4 focus-visible:outline-2 focus-visible:outline-[var(--pick)] ${
          movable ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : ''
        }`}
        style={{
          left: frameX,
          top: frameY,
          width: frameW,
          height: frameH,
          boxShadow: '0 0 0 9999px rgb(11 11 26 / 0.64)',
          ['--pick' as string]: ink,
          transition: smooth
            ? 'left 220ms ease, top 220ms ease, width 220ms ease, height 220ms ease'
            : undefined,
        }}
        data-testid="crop-frame"
      >
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        >
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="none"
            stroke="rgb(11 11 26 / 0.45)"
            strokeWidth="3"
            strokeDasharray="7 6"
          />
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="none"
            stroke="#fff"
            strokeWidth="1.5"
            strokeDasharray="7 6"
          />
          {/* Thirds, only while moving the photo. */}
          {dragging
            ? ['33.33%', '66.66%'].map((at) => (
                <g key={at} stroke="#fff" strokeOpacity="0.35" strokeWidth="1">
                  <line x1={at} x2={at} y1="0" y2="100%" />
                  <line y1={at} y2={at} x1="0" x2="100%" />
                </g>
              ))
            : null}
        </svg>
        {/* Tailor's corner marks. */}
        {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
          <span
            key={c}
            aria-hidden="true"
            className="pointer-events-none absolute size-4"
            style={{
              [c[0] === 't' ? 'top' : 'bottom']: -3,
              [c[1] === 'l' ? 'left' : 'right']: -3,
              borderColor: ink,
              borderStyle: 'solid',
              borderWidth: 0,
              [`border${c[0] === 't' ? 'Top' : 'Bottom'}Width`]: 3,
              [`border${c[1] === 'l' ? 'Left' : 'Right'}Width`]: 3,
            }}
          />
        ))}
        {/* The size tag hangs from the top right corner. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-3 right-3 flex items-center gap-1.5 rounded-md bg-[#fbf9ff] py-1 pr-2 pl-2.5 text-xs font-bold whitespace-nowrap text-[#1b1033] tabular-nums shadow-soft"
          style={{ clipPath: 'polygon(8px 0, 100% 0, 100% 100%, 8px 100%, 0 50%)' }}
          data-testid="size-tag"
        >
          <span className="size-1.5 rounded-full" style={{ background: ink }} />
          {label}
        </span>
      </div>

      {!size ? (
        <div className="absolute inset-0 grid place-items-center text-sm font-medium text-[#c9c6e0]">
          Laying out your photo…
        </div>
      ) : null}
    </div>
  );
}
