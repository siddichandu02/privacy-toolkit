/**
 * Saved settings moved to "pdfpip:" keys when the app was renamed. Each old key
 * is copied over once, so people keep their theme, recent tools and the
 * install reminder, then removed.
 */
export const RENAMED_KEYS: readonly (readonly [from: string, to: string])[] = [
  ['pt-theme', 'pdfpip:theme'],
  ['ptk:recent-tools', 'pdfpip:recent-tools'],
  ['ptk:install-later', 'pdfpip:install-later'],
];

export function migrateStorageKeys(store: Storage | undefined = globalThis.localStorage) {
  if (!store) return;
  for (const [from, to] of RENAMED_KEYS) {
    try {
      const old = store.getItem(from);
      if (old === null) continue;
      if (store.getItem(to) === null) store.setItem(to, old);
      store.removeItem(from);
    } catch {
      // Storage can be blocked (private mode, site data off). Nothing to keep then.
    }
  }
}
