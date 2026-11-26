import { motion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useStillMotion } from '../../useStillMotion';
import { getReturnFocus } from './store';

interface SheetProps {
  label: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  testId?: string;
}

/**
 * A modal sheet of paper that unfolds down from a crease at its top edge.
 * Locks page scroll, keeps Tab inside, closes on Escape or a backdrop click,
 * and hands focus back to whatever had it before.
 */
export function Sheet({ label, onClose, children, className = '', testId }: SheetProps) {
  const still = useStillMotion();
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

  return (
    <div className="fixed inset-0 z-50 flex justify-center px-3 pt-[calc(min(12vh,7rem)+env(safe-area-inset-top))] sm:px-6">
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-canvas/65 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={() => onClose()}
      />
      <div className="relative w-full max-w-xl [perspective:1400px]">
        <motion.div
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          tabIndex={-1}
          data-testid={testId}
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
