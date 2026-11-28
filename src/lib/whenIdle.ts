/** Run once the browser has a quiet moment (a short timeout where there is no idle callback). */
export function whenIdle(run: () => void, timeout = 1500): () => void {
  const { requestIdleCallback: ask, cancelIdleCallback: cancel } = globalThis;
  if (typeof ask === 'function' && typeof cancel === 'function') {
    const id = ask(run, { timeout });
    return () => cancel(id);
  }
  const id = setTimeout(run, 200);
  return () => clearTimeout(id);
}
