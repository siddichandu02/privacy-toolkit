import { motion, useDragControls, type PanInfo } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { PHONE_QUERY, useMedia } from '../../useMedia';
import { useStillMotion } from '../../useStillMotion';
import { shouldDismiss } from './sheetDrag';
import { getReturnFocus } from './store';

interface SheetProps {
  label: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  testId?: string;
  /**
   * Where it opens on phones. Most sheets rise from the bottom edge, within
   * thumb reach; the search stays at the top so the keyboard never covers it.
   */
  phone?: 'bottom' | 'top';
}

/**
 * A modal sheet of paper that unfolds down from a crease at its top edge.
 * On phones it slides up from the bottom instead and can be pulled down by its
 * grip to close. Locks page scroll, keeps Tab inside, closes on Escape or a
 * backdrop click, and hands focus back to whatever had it before.
 */
export function Sheet({
  label,
  onClose,
  children,
  className = '',
  testId,
  phone = 'bottom',
}: SheetProps) {
  const still = useStillMotion();
  const isPhone = useMedia(PHONE_QUERY);
  const bottom = isPhone && phone === 'bottom';
  const drag = useDragControls();
  const panel = useRef<HTMLDivElement>(null);
  // Read during render, before an autofocused field inside takes focus.
  const [opener] = useState(() => getReturnFocus() ?? document.activeElement);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = 'hidden';
    if (panel.current && !panel.current.contains(document.activeElement)) panel.current.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close.current();
        return;
      }
      if (e.key !== 'Tab' || !panel.current) return;
      const focusable = [
        ...panel.current.querySelectorAll<HTMLElement>(
          'input, button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      ];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      const inside = panel.current.contains(document.activeElement);
      if (!inside || document.activeElement === panel.current) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      root.style.overflow = overflow;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [opener]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (shouldDismiss(info.offset.y, info.velocity.y)) close.current();
  };

  const backdrop = (
    <motion.div
      aria-hidden="true"
      className="absolute inset-0 bg-canvas/65 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={() => onClose()}
    />
  );

  if (bottom) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center pt-[calc(2.5rem+env(safe-area-inset-top))]">
        {backdrop}
        <motion.div
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          tabIndex={-1}
          data-testid={testId}
          data-placement="bottom"
          className={`sheet-paper sheet-bottom relative flex max-h-full w-full flex-col overflow-hidden rounded-t-panel border border-b-0 border-line-strong bg-canvas-raised pb-[env(safe-area-inset-bottom)] shadow-lifted outline-none ${className}`}
          initial={still ? { opacity: 0 } : { y: '100%' }}
          animate={still ? { opacity: 1 } : { y: 0 }}
          exit={still ? { opacity: 0 } : { y: '100%' }}
          transition={
            still ? { duration: 0.15 } : { type: 'spring', stiffness: 380, damping: 36, mass: 0.9 }
          }
          drag={still ? false : 'y'}
          dragControls={drag}
          dragListener={false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.04, bottom: 0.9 }}
          dragMomentum={false}
          onDragEnd={onDragEnd}
        >
          <div
            data-testid="sheet-grip"
            aria-hidden="true"
            className="sheet-grip flex h-7 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
            onPointerDown={(e) => {
              if (!still) drag.start(e);
            }}
          >
            <span className="h-1.5 w-10 rounded-full bg-line-strong" />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-center px-3 pt-[calc(min(12vh,7rem)+env(safe-area-inset-top))] sm:px-6">
      {backdrop}
      <div className="relative w-full max-w-xl [perspective:1400px]">
        <motion.div
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          tabIndex={-1}
          data-testid={testId}
          data-placement="top"
          className={`sheet-paper relative max-h-[min(76vh,40rem)] overflow-hidden rounded-panel border border-line-strong bg-canvas-raised shadow-lifted outline-none ${className}`}
          style={{ transformOrigin: '50% 0%' }}
          initial={still ? { opacity: 0 } : { opacity: 0, rotateX: -58, y: -10 }}
          animate={{ opacity: 1, rotateX: 0, y: 0 }}
          exit={still ? { opacity: 0 } : { opacity: 0, rotateX: -40, y: -6 }}
          transition={
            still ? { duration: 0.15 } : { type: 'spring', stiffness: 420, damping: 30, mass: 0.8 }
          }
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}

/** A keyboard key drawn as a small raised paper tab. */
export function Key({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={`inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-b-2 border-line-strong bg-surface px-1.5 font-sans text-xs font-semibold text-fg ${className}`}
    >
      {children}
    </kbd>
  );
}
