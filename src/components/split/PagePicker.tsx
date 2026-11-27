import { motion } from 'framer-motion';
import { useRef, type CSSProperties } from 'react';
import { useStillMotion } from '../../useStillMotion';
import type { PdfPages } from '../drop/preview';
import { PageThumb } from '../pages/PageThumb';
import type { Accent } from '../ui/accent';

export interface PageMark {
  /** CSS colour of the part this page goes to. */
  color: string;
  /** Short tag on the tile, e.g. "PDF 2". */
  tag?: string;
}

export interface PagePickerProps {
  pages: PdfPages;
  accent: Accent;
  /** How each picked page is marked; undefined means not picked. */
  mark: (page: number) => PageMark | undefined;
  /**
   * A tile was clicked. `from` is the page clicked before when Shift is held,
   * so the caller can fill the run between them.
   */
  onPick?: (page: number, from: number | null) => void;
}

/**
 * A grid of page thumbnails. Picked pages lift and take their part's colour.
 * Without `onPick` the grid only shows where each page goes.
 */
export function PagePicker({ pages, accent, mark, onPick }: PagePickerProps) {
  const still = useStillMotion();
  const anchor = useRef<number | null>(null);
  const marks = Array.from({ length: pages.count }, (_, i) => mark(i + 1));
  const any = marks.some(Boolean);

  const click = (page: number, shift: boolean) => {
    if (!onPick) return;
    onPick(page, shift ? anchor.current : null);
    anchor.current = page;
  };

  return (
    <ul
      aria-label="Pages"
      className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 sm:gap-x-4 md:grid-cols-5 lg:grid-cols-6"
      style={{ '--pick': `var(--${accent})` } as CSSProperties}
    >
      {marks.map((m, i) => {
        const page = i + 1;
        const on = m !== undefined;
        const tile = (
          <>
            <span
              className={`relative block aspect-[3/4] overflow-hidden rounded-xl border-2 bg-white transition-[border-color,box-shadow] duration-200 ${
                on
                  ? 'border-[var(--part)] shadow-[0_10px_24px_-10px_var(--part)]'
                  : 'border-line group-hover:border-line-strong'
              }`}
            >
              <PageThumb pages={pages} page={page} />
              {/* Folded corner that turns into the part colour with a tick when picked */}
              <span
                aria-hidden="true"
                className={`absolute top-0 right-0 size-7 transition-transform duration-200 ${
                  on ? 'scale-100' : onPick ? 'scale-0 group-hover:scale-75' : 'scale-0'
                }`}
                style={{
                  background: `linear-gradient(225deg, transparent 50%, var(--part, var(--pick)) 50%)`,
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
              {m?.tag ? (
                <span
                  className="absolute bottom-1.5 left-1.5 rounded-md bg-[var(--part)] px-1.5 py-0.5 text-xs font-bold text-[var(--canvas)]"
                  data-testid="page-group"
                >
                  {m.tag}
                </span>
              ) : null}
            </span>
            <span
              className={`mt-2 block text-center text-sm font-semibold tabular-nums ${on ? 'text-fg' : 'text-muted'}`}
            >
              {page}
            </span>
          </>
        );
        const style = (m ? { '--part': m.color } : {}) as CSSProperties;
        const motionProps = {
          animate: { y: on && !still ? -4 : 0, opacity: any && !on ? 0.5 : 1 },
          transition: { type: 'spring' as const, stiffness: 500, damping: 28 },
        };
        return (
          <li key={page}>
            {onPick ? (
              <motion.button
                type="button"
                aria-pressed={on}
                aria-label={m?.tag ? `Page ${page}, ${m.tag}` : `Page ${page}`}
                data-testid="page-tile"
                onClick={(e) => click(page, e.shiftKey)}
                whileTap={still ? undefined : { scale: 0.95 }}
                {...motionProps}
                className="group block w-full rounded-xl text-left"
                style={style}
              >
                {tile}
              </motion.button>
            ) : (
              <motion.div
                data-testid="page-tile"
                aria-label={m?.tag ? `Page ${page}, ${m.tag}` : `Page ${page}`}
                role="img"
                {...motionProps}
                className="block w-full"
                style={style}
              >
                {tile}
              </motion.div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
