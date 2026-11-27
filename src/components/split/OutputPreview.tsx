import { AnimatePresence, motion } from 'framer-motion';
import type { CSSProperties } from 'react';
import type { PlannedFile } from '../../lib/pdf/split-plan';
import { useStillMotion } from '../../useStillMotion';
import type { PdfPages } from '../drop/preview';
import { PageThumb } from '../pages/PageThumb';
import type { Accent } from '../ui/accent';
import { partColor } from './partColors';

/** Cards drawn before the rest fold into a "+N more" card. */
export const PREVIEW_MAX = 12;

const pagesWord = (n: number) => (n === 1 ? '1 page' : `${n} pages`);

interface OutputPreviewProps {
  files: readonly PlannedFile[];
  pages: PdfPages;
  accent: Accent;
  zipName: string;
  /** Colour each card by its part (otherwise all in the tool accent). */
  colored: boolean;
}

/**
 * The files the split will make, as little paper stacks with their first
 * page, name and page range. Updates as ranges are typed or picked.
 */
export function OutputPreview({ files, pages, accent, zipName, colored }: OutputPreviewProps) {
  const still = useStillMotion();
  const shown = files.slice(0, PREVIEW_MAX);
  const more = files.length - shown.length;
  const summary =
    files.length === 0
      ? 'Nothing yet. Pick pages to see the files.'
      : files.length === 1
        ? `1 PDF, ${pagesWord(files[0]?.pages.length ?? 0)}.`
        : `${files.length} PDFs, packed in ${zipName}.`;

  return (
    <section
      aria-labelledby="split-out-title"
      className="rounded-2xl border border-line bg-canvas/40 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 id="split-out-title" className="font-display text-lg font-bold tracking-tight">
          You will get
        </h3>
        <p className="text-sm text-muted" aria-live="polite" data-testid="split-out-summary">
          {summary}
        </p>
      </div>
      <ul aria-label="Files you will get" className="mt-4 flex flex-wrap gap-x-4 gap-y-5">
        <AnimatePresence initial={false} mode="popLayout">
          {shown.length === 0 ? (
            <motion.li
              key="empty"
              layout={!still}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-hidden="true"
              className="h-36 w-[6.5rem] rounded-xl border-2 border-dashed border-line-strong sm:w-28"
            />
          ) : (
            shown.map((file, i) => (
              <motion.li
                key={`${i}-${file.label}`}
                layout={!still}
                data-testid="output-file"
                data-pages={file.pages.join(',')}
                initial={still ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={still ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                className="w-[6.5rem] sm:w-28"
                style={
                  { '--part': colored ? partColor(i, accent) : `var(--${accent})` } as CSSProperties
                }
              >
                <FileStack pages={pages} first={file.pages[0] ?? 1} count={file.pages.length} />
                <p className="mt-2 line-clamp-2 text-xs font-semibold break-all" title={file.name}>
                  {file.name}
                </p>
                <p className="text-xs text-muted">{file.label}</p>
              </motion.li>
            ))
          )}
          {more > 0 ? (
            <motion.li
              key="more"
              layout={!still}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid h-36 w-[6.5rem] place-items-center rounded-xl border border-line bg-surface text-center sm:w-28"
            >
              <span>
                <span className="block font-display text-xl font-bold">+{more}</span>
                <span className="text-xs text-muted">more files</span>
              </span>
            </motion.li>
          ) : null}
        </AnimatePresence>
      </ul>
    </section>
  );
}

/** First page on top, one or two sheet edges behind it for longer files. */
function FileStack({ pages, first, count }: { pages: PdfPages; first: number; count: number }) {
  const behind = Math.min(2, count - 1);
  return (
    <div className="relative h-36 pt-1.5 pr-1.5" aria-hidden="true">
      {Array.from({ length: behind }, (_, i) => (
        <span
          key={i}
          className="absolute top-1.5 right-1.5 bottom-0 left-0 rounded-lg border border-line-strong bg-canvas-raised"
          style={{ transform: `translate(${(behind - i) * 3}px, ${-(behind - i) * 3}px)` }}
        />
      ))}
      <span className="relative block h-full overflow-hidden rounded-lg border-2 border-[var(--part)] bg-white shadow-soft">
        <PageThumb pages={pages} page={first} />
        <span className="absolute inset-x-0 top-0 h-1 bg-[var(--part)]" />
        {count > 1 ? (
          <span className="absolute right-1 bottom-1 rounded-md bg-[var(--part)] px-1.5 py-0.5 text-[0.7rem] font-bold text-[var(--canvas)] tabular-nums">
            {count}
          </span>
        ) : null}
      </span>
    </div>
  );
}
