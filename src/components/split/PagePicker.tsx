import { motion } from 'framer-motion';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useStillMotion } from '../../useStillMotion';
import type { PdfPages } from '../drop/preview';
import type { Accent } from '../ui/accent';

const THUMB_WIDTH = 132;

/** Draws its page once it scrolls near the screen, then keeps the image. */
function Thumb({ pages, page }: { pages: PdfPages; page: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let alive = true;
    let made: string | null = null;
    const draw = () => {
      pages.render(page, THUMB_WIDTH).then(
        (u) => {
          made = u;
          if (alive) setUrl(u);
          else if (u) URL.revokeObjectURL(u);
        },
        () => {},
      );
    };
    if (typeof IntersectionObserver === 'undefined') {
      draw();
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            io.disconnect();
            draw();
          }
        },
        { rootMargin: '300px' },
      );
      io.observe(el);
      return () => {
        alive = false;
        io.disconnect();
        if (made) URL.revokeObjectURL(made);
      };
    }
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [pages, page]);

  return (
    <div ref={ref} className="absolute inset-0">
      {url ? (
        <img src={url} alt="" className="size-full object-contain" draggable={false} />
      ) : (
        <div className="size-full animate-pulse bg-line" />
      )}
    </div>
  );
}

export interface PagePickerProps {
  pages: PdfPages;
  accent: Accent;
  /** Pages currently chosen (1-based). */
  selected: ReadonlySet<number>;
  /** File number per page when each range becomes its own PDF. */
  groups?: ReadonlyMap<number, number>;
  onChange: (next: Set<number>) => void;
}

/**
 * A grid of page thumbnails to tick on and off. Shift-click picks every page
 * between the last one touched and this one.
 */
export function PagePicker({ pages, accent, selected, groups, onChange }: PagePickerProps) {
  const still = useStillMotion();
  const anchor = useRef<number | null>(null);
  const any = selected.size > 0;
  const color = `var(--${accent})`;

  const toggle = (page: number, extend: boolean) => {
    const next = new Set(selected);
    const from = anchor.current;
    if (extend && from !== null) {
      const on = selected.has(from);
      const [lo, hi] = from < page ? [from, page] : [page, from];
      for (let p = lo; p <= hi; p++) {
        if (on) next.add(p);
        else next.delete(p);
      }
    } else if (next.has(page)) {
      next.delete(page);
    } else {
      next.add(page);
    }
    anchor.current = page;
    onChange(next);
  };

  return (
    <ul
      aria-label="Pages"
      className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 sm:gap-x-4 md:grid-cols-5"
      style={{ '--pick': color } as CSSProperties}
    >
      {Array.from({ length: pages.count }, (_, i) => {
        const page = i + 1;
        const on = selected.has(page);
        const group = on ? groups?.get(page) : undefined;
        return (
          <li key={page}>
            <motion.button
              type="button"
              aria-pressed={on}
              aria-label={`Page ${page}`}
              data-testid="page-tile"
              onClick={(e) => toggle(page, e.shiftKey)}
              whileTap={still ? undefined : { scale: 0.95 }}
              animate={{ y: on && !still ? -4 : 0, opacity: any && !on ? 0.5 : 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
              className="group block w-full rounded-xl text-left"
            >
              <span
                className={`relative block aspect-[3/4] overflow-hidden rounded-xl border-2 bg-white transition-[border-color,box-shadow] duration-200 ${
                  on
                    ? 'border-[var(--pick)] shadow-[0_10px_24px_-10px_var(--pick)]'
                    : 'border-line group-hover:border-line-strong'
                }`}
              >
                <Thumb pages={pages} page={page} />
                {/* Folded corner that turns into the accent with a tick when picked */}
                <span
                  aria-hidden="true"
                  className={`absolute top-0 right-0 size-7 transition-transform duration-200 ${
                    on ? 'scale-100' : 'scale-0 group-hover:scale-75'
                  }`}
                  style={{
                    background: `linear-gradient(225deg, transparent 50%, ${color} 50%)`,
                    transformOrigin: 'top right',
                  }}
                >
                  <svg viewBox="0 0 28 28" className="size-full">
                    <path
                      d="M6.5 16.5 10 20l6-7"
                      fill="none"
                      stroke="var(--canvas)"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                {group !== undefined ? (
                  <span
                    className="absolute bottom-1.5 left-1.5 rounded-md px-1.5 py-0.5 text-xs font-bold"
                    style={{ background: color, color: 'var(--canvas)' }}
                    data-testid="page-group"
                  >
                    PDF {group}
                  </span>
                ) : null}
              </span>
              <span
                className={`mt-2 block text-center text-sm font-semibold tabular-nums ${on ? 'text-fg' : 'text-muted'}`}
              >
                {page}
              </span>
            </motion.button>
          </li>
        );
      })}
    </ul>
  );
}
