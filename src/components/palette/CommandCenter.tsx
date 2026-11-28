import { AnimatePresence } from 'framer-motion';
import { lazy, Suspense, useEffect } from 'react';
import { whenIdle } from '../../lib/whenIdle';
import { closeOverlay, getOverlay, openOverlay, useOverlay } from './store';

// The sheets are not needed for the first screen, so they load on their own
// and are fetched in the first quiet moment after the page is up.
const loadPalette = () => import('./CommandPalette');
const loadShortcuts = () => import('./ShortcutsSheet');
const loadInstall = () => import('./InstallSheet');
const CommandPalette = lazy(() => loadPalette().then((m) => ({ default: m.CommandPalette })));
const ShortcutsSheet = lazy(() => loadShortcuts().then((m) => ({ default: m.ShortcutsSheet })));
const InstallSheet = lazy(() => loadInstall().then((m) => ({ default: m.InstallSheet })));

/** Fetch every sheet's code without showing anything; safe to call more than once. */
function preloadSheets() {
  return Promise.all([loadPalette(), loadShortcuts(), loadInstall()]);
}

const isTyping = (el: Element | null) =>
  el instanceof HTMLInputElement ||
  el instanceof HTMLTextAreaElement ||
  el instanceof HTMLSelectElement ||
  (el instanceof HTMLElement && el.isContentEditable);

/** Global keys: Ctrl/Cmd+K toggles the tool search, "?" opens the shortcuts list. */
export function CommandCenter() {
  const overlay = useOverlay();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openOverlay(getOverlay() === 'palette' ? null : 'palette');
        return;
      }
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (getOverlay() === 'shortcuts' || isTyping(document.activeElement)) return;
        e.preventDefault();
        openOverlay('shortcuts');
      }
    };
    window.addEventListener('keydown', onKey);
    const cancelIdle = whenIdle(() => void preloadSheets().catch(() => {}), 4000);
    return () => {
      window.removeEventListener('keydown', onKey);
      cancelIdle();
    };
  }, []);

  return (
    <Suspense fallback={null}>
      <AnimatePresence>
        {overlay === 'palette' ? <CommandPalette key="palette" onClose={closeOverlay} /> : null}
        {overlay === 'shortcuts' ? <ShortcutsSheet key="shortcuts" onClose={closeOverlay} /> : null}
        {overlay === 'install' ? <InstallSheet key="install" onClose={closeOverlay} /> : null}
      </AnimatePresence>
    </Suspense>
  );
}
