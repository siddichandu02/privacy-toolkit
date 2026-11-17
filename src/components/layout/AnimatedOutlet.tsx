import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { useLayoutEffect, useState } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';

const slide: Variants = {
  initial: { opacity: 0, y: 18, scale: 0.985 },
  enter: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 320, damping: 30, mass: 0.8 },
  },
  exit: { opacity: 0, y: -10, transition: { duration: 0.15, ease: 'easeIn' } },
};

const fade: Variants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

/**
 * Keeps rendering the outlet it mounted with, so the leaving page stays intact
 * while it animates out instead of swapping to the new page mid-exit.
 */
function FrozenOutlet() {
  const outlet = useOutlet();
  const [frozen] = useState(outlet);
  return frozen;
}

/** Route outlet with a springy slide between pages (a plain fade with reduced motion). */
export function AnimatedOutlet() {
  const location = useLocation();
  const reduced = useReducedMotion();
  const [firstKey] = useState(location.key);

  return (
    <AnimatePresence mode="wait" initial={false} onExitComplete={() => window.scrollTo(0, 0)}>
      <motion.div
        key={location.pathname}
        variants={reduced ? fade : slide}
        initial="initial"
        animate="enter"
        exit="exit"
      >
        <RouteFocus enabled={location.key !== firstKey} />
        <FrozenOutlet />
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * After client-side navigation, move focus to the new page's heading so screen
 * reader and keyboard users land at the top of the new content.
 */
function RouteFocus({ enabled }: { enabled: boolean }) {
  useLayoutEffect(() => {
    if (!enabled) return;
    const h1 = document.querySelector<HTMLElement>('main h1');
    if (!h1) return;
    h1.tabIndex = -1;
    h1.focus({ preventScroll: true });
  }, [enabled]);

  return null;
}
