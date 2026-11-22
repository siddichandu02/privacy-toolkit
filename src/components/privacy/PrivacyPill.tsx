import { AnimatePresence, motion } from 'framer-motion';
import { useId, useState } from 'react';
import { tally, useNetEntries } from '../../lib/netWatch';
import { useStillMotion } from '../../useStillMotion';
import { PrivacyProof } from './PrivacyProof';
import { useOnline } from './useOnline';

/**
 * A small live reading for tool pages: "0 bytes sent" with a beating dot.
 * Opens into the full check. Counts only from when this tool was opened.
 */
export function PrivacyPill({ since, className = '' }: { since: number; className?: string }) {
  const entries = useNetEntries();
  const online = useOnline();
  const still = useStillMotion();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const clean = tally(entries, since).outsideRequests === 0;

  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className={`group inline-flex items-center gap-2.5 rounded-full border bg-surface py-1.5 pr-3 pl-2.5 text-sm font-semibold shadow-soft backdrop-blur-xl transition-[transform,border-color] duration-200 hover:-translate-y-0.5 active:scale-95 ${
          clean ? 'border-mint/30 hover:border-mint/60' : 'border-coral/50'
        }`}
      >
        <span className="relative flex size-2" aria-hidden="true">
          {still ? null : (
            <span
              className={`absolute inset-0 animate-ping rounded-full opacity-60 ${clean ? 'bg-mint' : 'bg-coral'}`}
            />
          )}
          <span className={`relative size-2 rounded-full ${clean ? 'bg-mint' : 'bg-coral'}`} />
        </span>
        <span className={clean ? 'text-mint' : 'text-coral'}>
          {clean ? '0 bytes sent' : 'Something was sent'}
        </span>
        <span className="font-medium text-muted">
          {online ? 'checked live' : 'offline, still working'}
        </span>
        <svg
          viewBox="0 0 16 16"
          className={`size-3.5 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <path
            d="m4 6 4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div id={panelId}>
        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              initial={still ? { opacity: 0 } : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={still ? { opacity: 0 } : { opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="max-w-2xl overflow-hidden"
            >
              <PrivacyProof since={since} scope="tool" className="mt-4" />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
