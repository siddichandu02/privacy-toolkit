import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ToastContext, type ToastApi, type ToastOptions, type ToastTone } from './toast-context';

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
  duration: number;
}

const MAX_VISIBLE = 3;

const toneStyles: Record<ToastTone, { ring: string; icon: string }> = {
  success: { ring: 'bg-mint/15 text-mint', icon: 'M5 12.5l4.5 4.5L19 7.5' },
  error: { ring: 'bg-coral/15 text-coral', icon: 'M12 7v6m0 4h.01' },
  info: { ring: 'bg-sky/15 text-sky', icon: 'M12 11v6m0-10h.01' },
};

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    const id = nextId++;
    const tone = options.tone ?? 'info';
    const item: ToastItem = {
      id,
      title: options.title,
      description: options.description,
      tone,
      // Errors stay longer: people need time to read what went wrong.
      duration: options.duration ?? (tone === 'error' ? 7000 : 4500),
    };
    setItems((list) => [...list, item].slice(-MAX_VISIBLE));
    return id;
  }, []);

  const api = useMemo<ToastApi>(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ol
        aria-label="Notifications"
        className="pointer-events-none fixed inset-x-0 bottom-[env(safe-area-inset-bottom)] z-[60] flex flex-col items-center gap-2.5 p-4 sm:inset-x-auto sm:right-[env(safe-area-inset-right)] sm:items-end sm:p-6"
      >
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <ToastCard key={item.id} item={item} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </ol>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const tone = toneStyles[item.tone];
  const { id, duration } = item;

  useEffect(() => {
    if (!duration || paused) return;
    const timer = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, paused, onDismiss]);

  return (
    <motion.li
      layout={!reduced}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.9, transition: { duration: 0.18 } }}
      transition={reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 420, damping: 30 }}
      drag={reduced ? false : 'x'}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 90) onDismiss(id);
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto flex w-full max-w-sm touch-pan-y items-start gap-3 rounded-card border border-line-strong bg-canvas-raised/90 p-3.5 pr-2.5 text-fg shadow-lifted backdrop-blur-xl"
    >
      <span className={`grid size-8 shrink-0 place-items-center rounded-full ${tone.ring}`}>
        <svg
          viewBox="0 0 24 24"
          className="size-4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d={tone.icon} />
        </svg>
      </span>
      {/* The live role sits inside the item: a list item can't be a status itself. */}
      <div
        role={item.tone === 'error' ? 'alert' : 'status'}
        aria-atomic="true"
        className="min-w-0 flex-1 pt-1"
      >
        <p className="text-sm leading-tight font-semibold">{item.title}</p>
        {item.description ? (
          <p className="mt-1 text-sm leading-snug text-muted">{item.description}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(id)}
        aria-label="Dismiss notification"
        className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-muted transition-colors hover:bg-surface-strong hover:text-fg"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </motion.li>
  );
}
