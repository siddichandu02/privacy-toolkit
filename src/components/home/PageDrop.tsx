import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useStillMotion } from '../../useStillMotion';
import { PageDropContext, isFileDrag, peekItems, type DragPeek } from './pageDrag';
import { sortFiles, type Sorted } from './suggest';

/**
 * Lets a file be dragged anywhere on the home page. While it hovers, tool
 * cards that can open it lift and glow and the rest step back. A drop on a
 * glowing card opens that tool; a drop anywhere else lands in the hero.
 */
export function PageDrop({ children, onLanded }: { children: ReactNode; onLanded?: () => void }) {
  const still = useStillMotion();
  const [peek, setPeek] = useState<DragPeek | null>(null);
  const [sorted, setSortedState] = useState<Sorted | null>(null);
  const depth = useRef(0);
  const watchdog = useRef<number | undefined>(undefined);
  const landed = useRef(onLanded);
  useEffect(() => {
    landed.current = onLanded;
  }, [onLanded]);

  const setSorted = useCallback((next: Sorted | null) => setSortedState(next), []);

  useEffect(() => {
    const end = () => {
      depth.current = 0;
      window.clearTimeout(watchdog.current);
      setPeek(null);
    };
    // Browsers keep firing dragover while a drag is over the page, so if it
    // stops (a drag cancelled outside the window) the page settles back.
    const arm = () => {
      window.clearTimeout(watchdog.current);
      watchdog.current = window.setTimeout(end, 600);
    };
    const enter = (e: DragEvent) => {
      if (!isFileDrag(e)) return;
      depth.current += 1;
      setPeek(peekItems(e.dataTransfer?.items));
      arm();
    };
    const over = (e: DragEvent) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      if (e.dataTransfer && !e.defaultPrevented) e.dataTransfer.dropEffect = 'copy';
      arm();
    };
    const leave = (e: DragEvent) => {
      if (!isFileDrag(e)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) end();
    };
    const drop = (e: DragEvent) => {
      if (!isFileDrag(e)) return;
      const handled = e.defaultPrevented;
      e.preventDefault();
      end();
      if (handled) return;
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (!files.length) return;
      setSortedState(sortFiles(files));
      landed.current?.();
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragover', over);
    window.addEventListener('dragleave', leave);
    window.addEventListener('drop', drop);
    window.addEventListener('dragend', end);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragover', over);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('drop', drop);
      window.removeEventListener('dragend', end);
      window.clearTimeout(watchdog.current);
    };
  }, []);

  const value = useMemo(() => ({ peek, sorted, setSorted }), [peek, sorted, setSorted]);
  const usable = peek ? peek.pdf + peek.image + peek.unknown : 0;

  return (
    <PageDropContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {peek ? (
          <motion.div
            key="page-drop"
            data-testid="page-drop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: still ? 0.1 : 0.2 }}
            className="pointer-events-none fixed inset-0 z-40"
            aria-hidden="true"
          >
            {/* A soft glow around the window edge, so the whole page reads as a target. */}
            <div className="absolute inset-0 opacity-60 shadow-[inset_0_0_0_3px_var(--violet),inset_0_0_120px_-20px_var(--violet)]" />
            <motion.p
              initial={still ? false : { y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 26 }}
              className="absolute inset-x-4 bottom-6 mx-auto w-fit max-w-[calc(100%-2rem)] rounded-full border border-line-strong bg-surface-strong px-5 py-3 text-center text-sm font-semibold shadow-lifted backdrop-blur-xl sm:text-base"
            >
              {usable
                ? `Drop ${describePeek(peek)} on a glowing card, or anywhere to see every option`
                : "That file can't be opened yet. Try a PDF or a photo."}
            </motion.p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </PageDropContext.Provider>
  );
}

function describePeek(p: DragPeek): string {
  const parts: string[] = [];
  if (p.pdf) parts.push(p.pdf > 1 ? `${p.pdf} PDFs` : 'the PDF');
  if (p.image) parts.push(p.image > 1 ? `${p.image} photos` : 'the photo');
  if (!parts.length) {
    const n = p.unknown;
    return n > 1 ? `your ${n} files` : 'your file';
  }
  return parts.join(' and ');
}
