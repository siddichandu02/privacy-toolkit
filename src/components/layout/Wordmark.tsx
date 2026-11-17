import { motion } from 'framer-motion';

/**
 * A sheet of paper with its corner folded over, the same paper-craft family as
 * Pip. The fold lifts when a parent motion element enters its "hover" variant.
 */
export function WordmarkIcon({ className = '' }: { className?: string }) {
  return (
    <motion.svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="wm-sheet" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--violet)" />
          <stop offset="1" stopColor="var(--coral)" />
        </linearGradient>
      </defs>
      <path
        d="M7 4h12l7 7v15a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
        fill="url(#wm-sheet)"
      />
      <motion.path
        d="M19 4v5a2 2 0 0 0 2 2h5Z"
        fill="var(--fg)"
        opacity="0.85"
        style={{ transformOrigin: '19px 11px' }}
        variants={{ rest: { scale: 1 }, hover: { scale: 1.25 } }}
        transition={{ type: 'spring', stiffness: 400, damping: 14 }}
      />
      <rect x="9.5" y="16" width="10" height="2.2" rx="1.1" fill="var(--canvas)" opacity="0.7" />
      <rect x="9.5" y="20.5" width="7" height="2.2" rx="1.1" fill="var(--canvas)" opacity="0.7" />
    </motion.svg>
  );
}
