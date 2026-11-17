import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { ToolInfo } from '../../tools';
import { ToolCard } from './ToolCard';

interface ToolGridProps {
  tools: readonly ToolInfo[];
  className?: string;
  /**
   * Give the first and last tools wide cards on large screens. With ten tools
   * in three columns that closes the grid into four full rows.
   */
  featureEnds?: boolean;
}

const spring = { type: 'spring', stiffness: 380, damping: 32 } as const;

/**
 * Responsive grid of tool cards: one column on phones, up to three on desktop.
 * Cards shuffle into place when the list is filtered.
 */
export function ToolGrid({ tools, className = '', featureEnds = false }: ToolGridProps) {
  const reduced = useReducedMotion();
  return (
    <ul className={`grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 ${className}`}>
      <AnimatePresence initial={false} mode="popLayout">
        {tools.map((tool, i) => {
          const featured = featureEnds && (i === 0 || i === tools.length - 1);
          return (
            <motion.li
              key={tool.id}
              layout={!reduced}
              initial={{ opacity: 0, scale: reduced ? 1 : 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: reduced ? 1 : 0.92 }}
              transition={reduced ? { duration: 0.15 } : spring}
              className={featured ? 'lg:col-span-2' : undefined}
            >
              <ToolCard tool={tool} featured={featured} />
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
