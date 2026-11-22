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

/** Files taken out by the last remove, with where each one sat, for Undo. */
export interface RemovedFiles {
  entries: { item: QueuedFile; index: number }[];
  /** Bumped on every remove so an Undo bar can restart its timer. */
  stamp: number;
}

/** Put removed files back where they were. Indices are positions in the old list. */
export function restoreItems(
  list: readonly QueuedFile[],
  entries: RemovedFiles['entries'],
): QueuedFile[] {
  const next = [...list];
  for (const { item, index } of [...entries].sort((a, b) => a.index - b.index)) {
    if (next.some((x) => x.id === item.id)) continue;
    next.splice(Math.min(index, next.length), 0, item);
  }
  return next;
}

let stamps = 0;

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

  const [removed, setRemoved] = useState<RemovedFiles | null>(null);

  /** Take one file out. It can be put back with undo(). */
  const remove = useCallback(
    (id: string) => {
      const index = items.findIndex((item) => item.id === id);
      const item = items[index];
      if (!item) return;
      setItems((prev) => prev.filter((x) => x.id !== id));
      setRemoved({ entries: [{ item, index }], stamp: ++stamps });
    },
    [items],
  );

  /** Take every file out. It can be put back with undo(). */
  const removeAll = useCallback(() => {
    if (items.length === 0) return;
    setRemoved({ entries: items.map((item, index) => ({ item, index })), stamp: ++stamps });
    setItems([]);
  }, [items]);

  const undo = useCallback(() => {
    if (!removed) return;
    setItems((prev) => restoreItems(prev, removed.entries));
    setRemoved(null);
  }, [removed]);

  const forget = useCallback(() => setRemoved(null), []);

  const move = useCallback((id: string, by: number) => {
    setItems((prev) => {
      const from = prev.findIndex((item) => item.id === id);
      return from === -1 ? prev : moveItem(prev, from, from + by);
    });
  }, []);

  /** Start over without offering Undo (e.g. after a finished job). */
  const clear = useCallback(() => {
    setItems([]);
    setRemoved(null);
  }, []);

  return { items, setItems, add, remove, removeAll, removed, undo, forget, move, clear };
}

export type FileQueue = ReturnType<typeof useFileQueue>;
