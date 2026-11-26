import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { PHONE_QUERY, useMedia } from '../../useMedia';
import { useStillMotion } from '../../useStillMotion';
import { accentButtonGlow, accentFill, type Accent } from '../ui/accent';

interface MainAction {
  button: HTMLButtonElement;
  label: string;
  disabled: boolean;
  /** The real button is further down the page, out of view. */
  below: boolean;
  /** A drawing or placing area reaches the bottom of the screen, so stay out of its way. */
  blocking: boolean;
}

/** Height of the strip at the bottom of the screen the copy covers. */
const DOCK_BAND = 120;

/**
 * Watches the tool's main button (marked `data-main-action`) inside `root`:
 * its words, whether it can be pressed, and whether it is below the screen.
 */
function useMainAction(host: HTMLElement | null, active: boolean): MainAction | null {
  const [state, setState] = useState<MainAction | null>(null);

  useEffect(() => {
    if (!active || !host || typeof IntersectionObserver === 'undefined') return;
    let button: HTMLButtonElement | null = null;
    let below = false;
    const inBand = new Set<Element>();
    const read = () => {
      if (!button) return setState(null);
      setState({
        button,
        label: button.textContent?.trim() ?? '',
        disabled: button.disabled,
        below,
        blocking: inBand.size > 0,
      });
    };
    const sight = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      below = !entry.isIntersecting && entry.boundingClientRect.top > 0;
      read();
    });
    // Canvases marked `data-dock-avoid` (signature pad, placer, crop frame) take
    // finger drags; the copy hides while any of them is under its strip.
    const band = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) inBand.add(e.target);
          else inBand.delete(e.target);
        }
        read();
      },
      { rootMargin: `-${Math.max(0, window.innerHeight - DOCK_BAND)}px 0px 0px 0px` },
    );
    const avoided = new Set<Element>();
    // Settings can swap the button out (or change its words), so keep looking.
    const find = () => {
      const next = host.querySelector<HTMLButtonElement>('[data-main-action]');
      if (next !== button) {
        if (button) sight.unobserve(button);
        button = next;
        if (button) sight.observe(button);
      }
      for (const el of host.querySelectorAll('[data-dock-avoid]')) {
        if (!avoided.has(el)) {
          avoided.add(el);
          band.observe(el);
        }
      }
      read();
    };
    const changes = new MutationObserver(find);
    changes.observe(host, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['disabled'],
    });
    find();
    return () => {
      changes.disconnect();
      sight.disconnect();
      band.disconnect();
    };
  }, [host, active]);

  return active && host ? state : null;
}

/**
 * On phones the tool's settings can push its main button far down the page.
 * While it is out of sight below, a copy rides at the bottom of the screen;
 * pressing it presses the real one. If the real one can't be pressed yet, the
 * copy takes you to it instead, where the reason is written.
 */
export function ActionDock({
  root,
  accent,
  hidden,
}: {
  root: HTMLElement | null;
  accent: Accent;
  /** Something else is using the bottom of the screen (the Undo slip). */
  hidden?: boolean;
}) {
  const still = useStillMotion();
  const phone = useMedia(PHONE_QUERY);
  const action = useMainAction(root, phone);
  const show = Boolean(phone && action?.below && !action.blocking && action.label && !hidden);

  const press = () => {
    if (!action) return;
    if (action.disabled) {
      action.button.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'center' });
      return;
    }
    action.button.click();
  };

  return (
    <AnimatePresence>
      {show && action ? (
        <motion.div
          key="dock"
          data-testid="action-dock"
          className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 pt-6 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
          style={{
            background: 'linear-gradient(to top, var(--color-canvas) 35%, transparent)',
          }}
          initial={still ? { opacity: 0 } : { opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={still ? { opacity: 0 } : { opacity: 0, y: 40 }}
          transition={still ? { duration: 0.15 } : { type: 'spring', stiffness: 460, damping: 34 }}
        >
          <motion.button
            type="button"
            onClick={press}
            whileTap={still ? undefined : { scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            // A shortcut for thumbs only: the real button stays in the tab order and
            // the reading order, so screen readers don't hear the same button twice.
            aria-hidden="true"
            tabIndex={-1}
            data-testid="action-dock-button"
            data-disabled={action.disabled}
            className={`pointer-events-auto flex h-14 w-full cursor-pointer items-center justify-center gap-2.5 rounded-[1.125rem] px-6 text-lg font-semibold shadow-lifted ${
              action.disabled
                ? 'border border-line-strong bg-canvas-raised text-fg'
                : `${accentFill[accent]} ${accentButtonGlow[accent]}`
            }`}
          >
            <span className="truncate">{action.label}</span>
            {action.disabled ? (
              <svg
                viewBox="0 0 20 20"
                className="size-5 shrink-0 text-muted"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M10 4v11M5 10.5l5 5 5-5" />
              </svg>
            ) : null}
          </motion.button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
