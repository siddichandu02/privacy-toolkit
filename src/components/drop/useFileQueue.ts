import { useCallback, useEffect, useState } from 'react';
import { clearHandoff, peekHandoff } from './handoff';

export interface QueuedFile {
  id: string;
  file: File;
}

let counter = 0;
const nextId = () => `f${Date.now().toString(36)}${(counter++).toString(36)}`;

/** Move the item at `from` to `to`, clamped to the list. Returns a new array. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const target = Math.max(0, Math.min(list.length - 1, to));
  if (from === target || from < 0 || from >= list.length) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(target, 0, item as T);
  return next;
}

/**
 * The ordered list of files a tool will work on. Pass the tool's id to start
 * with any files handed over from the home page drop zone.
 */
export function useFileQueue(toolId?: string) {
  const [items, setItems] = useState<QueuedFile[]>(() =>
    toolId ? peekHandoff(toolId).map((file) => ({ id: nextId(), file })) : [],
  );

  // Taken once the page is up, so a second render (or a later visit) starts clean.
  useEffect(() => {
    if (toolId) clearHandoff(toolId);
  }, [toolId]);

  const add = useCallback((files: readonly File[]) => {
    setItems((prev) => [...prev, ...files.map((file) => ({ id: nextId(), file }))]);
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const move = useCallback((id: string, by: number) => {
    setItems((prev) => {
      const from = prev.findIndex((item) => item.id === id);
      return from === -1 ? prev : moveItem(prev, from, from + by);
    });
  }, []);

  const clear = useCallback(() => setItems([]), []);

  return { items, setItems, add, remove, move, clear };
}

export type FileQueue = ReturnType<typeof useFileQueue>;
