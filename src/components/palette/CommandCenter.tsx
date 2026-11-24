import { AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { CommandPalette } from './CommandPalette';
import { ShortcutsSheet } from './ShortcutsSheet';
import { closeOverlay, getOverlay, openOverlay, useOverlay } from './store';

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
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <AnimatePresence>
      {overlay === 'palette' ? <CommandPalette key="palette" onClose={closeOverlay} /> : null}
      {overlay === 'shortcuts' ? <ShortcutsSheet key="shortcuts" onClose={closeOverlay} /> : null}
    </AnimatePresence>
  );
}
