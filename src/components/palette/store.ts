import { useSyncExternalStore } from 'react';

/** Which overlay is open: the tool search, the shortcuts sheet, or neither. */
export type Overlay = 'palette' | 'shortcuts' | null;

let current: Overlay = null;
const listeners = new Set<() => void>();

export function openOverlay(next: Overlay) {
  if (next === current) return;
  current = next;
  listeners.forEach((l) => l());
}

export const closeOverlay = () => openOverlay(null);
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
