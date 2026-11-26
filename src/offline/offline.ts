import { useSyncExternalStore } from 'react';

/**
 * - `off`: no offline copy (tests, the dev server, or a browser without service workers).
 * - `saving`: the first visit is storing the app on this device.
 * - `ready`: every tool works with no connection.
 */
export type OfflineState = 'off' | 'saving' | 'ready';

let state: OfflineState = 'off';
/** True once a first-time save finished during this visit (for the one-off "saved" note). */
let justSaved = false;
const listeners = new Set<() => void>();

function set(next: OfflineState, fresh = false) {
  if (next === state && !fresh) return;
  state = next;
  justSaved = justSaved || fresh;
  listeners.forEach((l) => l());
}

export const getOfflineState = () => state;
export const wasJustSaved = () => justSaved;

export function subscribeOffline(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useOfflineState(): OfflineState {
  return useSyncExternalStore(subscribeOffline, getOfflineState, () => 'off');
}

/** Follow one installing worker until it is in charge. */
function follow(worker: ServiceWorker, first: boolean) {
  const check = () => {
    if (worker.state === 'activated') set('ready', first);
    else if (worker.state === 'redundant') set('off');
  };
  worker.addEventListener('statechange', check);
  check();
}

/**
 * Store the app on this device so it opens and works with no connection.
 * Only in the built site: the dev server rebuilds files all the time.
 */
export async function startOffline(
  sw: ServiceWorkerContainer | undefined = 'serviceWorker' in navigator
    ? navigator.serviceWorker
    : undefined,
  url = `${import.meta.env.BASE_URL}sw.js`,
) {
  if (!sw) return;
  const first = !sw.controller;
  set(first ? 'saving' : 'ready');
  try {
    const reg = await sw.register(url, { scope: import.meta.env.BASE_URL });
    const worker = reg.installing ?? reg.waiting;
    if (worker) follow(worker, first);
    else if (reg.active) set('ready');
  } catch {
    set('off');
  }
}

/** For tests. */
export function resetOffline() {
  state = 'off';
  justSaved = false;
}
