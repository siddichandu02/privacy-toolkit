import { useSyncExternalStore } from 'react';

/** Which overlay is open: the tool search, the shortcuts sheet, the iPhone install steps, or none. */
export type Overlay = 'palette' | 'shortcuts' | 'install' | null;

let current: Overlay = null;
let returnTo: Element | null = null;
const listeners = new Set<() => void>();

export function openOverlay(next: Overlay) {
  if (next === current) return;
  // Remember what had focus before the first sheet, so switching from the
  // search to the shortcuts list still hands focus back to the right place.
  if (current === null && typeof document !== 'undefined') returnTo = document.activeElement;
  current = next;
  listeners.forEach((l) => l());
}

export const closeOverlay = () => openOverlay(null);

/** The element that had focus before any sheet opened. */
export const getReturnFocus = () => returnTo;
export const getOverlay = () => current;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useOverlay(): Overlay {
  return useSyncExternalStore(subscribe, getOverlay, () => null);
}

/** True on Apple keyboards, where the shortcut is Cmd instead of Ctrl. */
export function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform ?? navigator.platform;
  return /mac|iphone|ipad|ipod/i.test(platform);
}

export const modKey = () => (isMac() ? '⌘' : 'Ctrl');
