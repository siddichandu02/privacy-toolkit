import { useSyncExternalStore } from 'react';
import { getTool } from '../../tools';

const KEY = 'ptk:recent-tools';
const MAX = 4;
const listeners = new Set<() => void>();
const EMPTY: readonly string[] = [];
let cache: readonly string[] | null = null;

function read(): readonly string[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    if (!Array.isArray(raw)) return EMPTY;
    return raw.filter((id): id is string => typeof id === 'string' && !!getTool(id)).slice(0, MAX);
  } catch {
    // Private windows and blocked storage: nothing remembered.
    return EMPTY;
  }
}

/** Tool ids opened lately, newest first. Only known tools, at most four. */
export function getRecentTools(): readonly string[] {
  cache ??= read();
  return cache;
}

/** Remember that a tool was just opened. Storage failures are ignored. */
export function rememberTool(id: string) {
  if (!getTool(id)) return;
  const next = [id, ...getRecentTools().filter((t) => t !== id)].slice(0, MAX);
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Still remembered for this visit.
  }
  listeners.forEach((l) => l());
}

/** Forget every recent tool. */
export function clearRecentTools() {
  cache = EMPTY;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY && e.key !== null) return;
    cache = null;
    listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function useRecentTools(): readonly string[] {
  return useSyncExternalStore(subscribe, getRecentTools, () => EMPTY);
}

/** Test helper: drop the in-memory copy so the next read hits storage. */
export function resetRecentCache() {
  cache = null;
}
