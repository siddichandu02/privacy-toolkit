import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  cloneElement,
  useEffect,
  useId,
  useState,
  type FocusEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';

type TriggerProps = {
  'aria-describedby'?: string;
  onMouseEnter?: (e: MouseEvent) => void;
  onMouseLeave?: (e: MouseEvent) => void;
  onFocus?: (e: FocusEvent) => void;
  onBlur?: (e: FocusEvent) => void;
};

export interface TooltipProps {
  content: ReactNode;
  /** A single focusable element (usually a button). */
  children: ReactElement<TriggerProps>;
  side?: 'top' | 'bottom';
  delay?: number;
}

const placement = {
  top: 'bottom-full mb-2.5',
  bottom: 'top-full mt-2.5',
};

/**
 * Shows on hover and keyboard focus, hides on blur, mouse leave or Escape.
 * The trigger is linked with aria-describedby so screen readers announce it.
 */
export function Tooltip({ content, children, side = 'top', delay = 250 }: TooltipProps) {
  const [intent, setIntent] = useState<'idle' | 'hover' | 'focus'>('idle');
  const [hoverDelayDone, setHoverDelayDone] = useState(false);
  const id = useId();
  const reduced = useReducedMotion();

  // Hover waits a beat so the tip doesn't flash while the pointer passes by.
  useEffect(() => {
    if (intent !== 'hover') return;
    const timer = setTimeout(() => setHoverDelayDone(true), delay);
    return () => {
      clearTimeout(timer);
      setHoverDelayDone(false);
    };
  }, [intent, delay]);

  const open = intent === 'focus' || (intent === 'hover' && hoverDelayDone);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIntent('idle');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const props = children.props;
  const trigger = cloneElement(children, {
    'aria-describedby': open
      ? [props['aria-describedby'], id].filter(Boolean).join(' ')
      : props['aria-describedby'],
    onMouseEnter: (e: MouseEvent) => {
      props.onMouseEnter?.(e);
      setIntent('hover');
    },
    onMouseLeave: (e: MouseEvent) => {
      props.onMouseLeave?.(e);
      setIntent('idle');
    },
    onFocus: (e: FocusEvent) => {
      props.onFocus?.(e);
      setIntent('focus');
    },
    onBlur: (e: FocusEvent) => {
      props.onBlur?.(e);
      setIntent('idle');
    },
  });

  const offset = side === 'top' ? 6 : -6;

  return (
    <span className="relative inline-flex">
      {trigger}
      <AnimatePresence>
        {open ? (
          <motion.span
            id={id}
            role="tooltip"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: offset, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: offset / 2, scale: 0.96 }}
            transition={
              reduced ? { duration: 0.12 } : { type: 'spring', stiffness: 520, damping: 30 }
            }
            className={`pointer-events-none absolute left-1/2 z-50 w-max max-w-60 -translate-x-1/2 rounded-xl border border-line-strong bg-canvas-raised px-3 py-1.5 text-center text-xs leading-snug font-medium text-fg shadow-lifted ${placement[side]}`}
          >
            {content}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
}
