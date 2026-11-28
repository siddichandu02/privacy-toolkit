export type Theme = 'dark' | 'light';

export const STORAGE_KEY = 'pdfpip:theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

/** The saved choice, or null when the user has not picked one yet. */
export function readStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null;
  }
}

export function writeStoredTheme(theme: Theme | null): void {
  try {
    if (theme) localStorage.setItem(STORAGE_KEY, theme);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be blocked (private mode, strict settings). The theme still
    // applies for this visit, it just won't be remembered.
  }
}

export function systemTheme(): Theme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
  // Dark is the house default, so only an explicit light preference flips it.
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function resolveTheme(): Theme {
  return readStoredTheme() ?? systemTheme();
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', theme === 'dark' ? '#0B0B1A' : '#FAF8FF');
}

type Listener = () => void;
const listeners = new Set<Listener>();
let current: Theme | null = null;

function emit() {
  for (const listener of listeners) listener();
}

export function getTheme(): Theme {
  current ??= resolveTheme();
  return current;
}

export function setTheme(theme: Theme): void {
  current = theme;
  writeStoredTheme(theme);
  applyTheme(theme);
  emit();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);

  // Follow the OS setting live, but only while the user hasn't chosen.
  const media = typeof window !== 'undefined' ? window.matchMedia?.(DARK_QUERY) : undefined;
  const onSystemChange = () => {
    if (readStoredTheme()) return;
    current = systemTheme();
    applyTheme(current);
    emit();
  };
  media?.addEventListener('change', onSystemChange);

  return () => {
    listeners.delete(listener);
    media?.removeEventListener('change', onSystemChange);
  };
}

/** Test helper: forget the cached value so the next read starts fresh. */
export function resetThemeCache(): void {
  current = null;
}
