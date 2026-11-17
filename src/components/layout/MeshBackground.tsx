import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { CSSProperties } from 'react';
import { useRouteAccent } from './useRouteAccent';

/**
 * Slowly drifting gradient mesh behind every page. On a tool page a glow in
 * that tool's accent rises from the top and crossfades as you move between tools.
 */
export function MeshBackground() {
  const accent = useRouteAccent();
  const reduced = useReducedMotion();

  return (
    <div aria-hidden="true" data-accent={accent ?? 'none'} className="mesh-root">
      <div className="mesh" />
      <AnimatePresence>
        {accent ? (
          <motion.div
            key={accent}
            className="mesh-accent"
            style={{ '--tint': `var(--${accent})` } as CSSProperties}
            initial={{ opacity: 0, y: reduced ? 0 : -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0.2 : 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
