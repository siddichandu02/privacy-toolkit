import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useRef, type PointerEvent } from 'react';
import type { ToolInfo } from '../../tools';
import { spotFor } from './spotlight';
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
  const list = useRef<HTMLUListElement>(null);
  const frame = useRef(0);

  // One spotlight follows the mouse across the grid; cards near it lean in.
  // Read every card's box first, then write, once per frame.
  const follow = (e: PointerEvent<HTMLUListElement>) => {
    if (reduced || e.pointerType !== 'mouse') return;
    const { clientX: x, clientY: y } = e;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const root = list.current;
      if (!root) return;
      root.dataset.spotlight = 'on';
      const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-card]'));
      const boxes = cards.map((c) => c.getBoundingClientRect());
      cards.forEach((card, i) => {
        const box = boxes[i];
        if (!box) return;
        const s = spotFor(box, x, y);
        card.style.setProperty('--sx', `${s.sx}px`);
        card.style.setProperty('--sy', `${s.sy}px`);
        card.style.setProperty('--pull-x', `${s.pullX}px`);
        card.style.setProperty('--pull-y', `${s.pullY}px`);
      });
    });
  };
  const rest = () => {
    cancelAnimationFrame(frame.current);
    const root = list.current;
    if (!root) return;
    root.dataset.spotlight = 'off';
    root.querySelectorAll<HTMLElement>('[data-card]').forEach((card) => {
      card.style.setProperty('--pull-x', '0px');
      card.style.setProperty('--pull-y', '0px');
    });
  };

  return (
    <ul
      ref={list}
      data-spotlight="off"
      onPointerMove={follow}
      onPointerLeave={rest}
      className={`grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 ${className}`}
    >
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
