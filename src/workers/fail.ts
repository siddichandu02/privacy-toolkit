/** Shown when the browser runs out of room for a job. */
export const MEMORY_MESSAGE =
  'Your browser ran out of memory on this one. Try fewer or smaller files at a time.';

/** Shown when the browser can no longer read a file the user picked. */
export const UNREADABLE_MESSAGE =
  'One of your files could not be opened. It may have been moved or changed since you added it. Remove it and add it again.';

/** True when an error looks like the browser could not allocate memory. */
export function isOutOfMemory(err: unknown): boolean {
  return (
    err instanceof RangeError ||
    (err instanceof Error && /out of memory|allocation failed|array buffer/i.test(err.message))
  );
}

/**
 * The friendly message for an error a tool did not expect. Logs the real
 * error during development so it is not hidden behind the friendly text.
 */
export function unexpectedMessage(err: unknown, fallback: string): string {
  if (import.meta.env.DEV && import.meta.env.MODE !== 'test') console.error(err);
  if (isOutOfMemory(err)) return MEMORY_MESSAGE;
  // A File is a snapshot: once the original is moved or edited, reading it
  // fails every time, so retrying alone will not help.
  if (err instanceof DOMException && err.name === 'NotReadableError') return UNREADABLE_MESSAGE;
  return fallback;
}
