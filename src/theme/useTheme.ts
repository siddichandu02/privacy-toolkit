import { useCallback, useSyncExternalStore } from 'react';
import { getTheme, setTheme, subscribe, type Theme } from './theme';

export function useTheme(): {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
} {
  const theme = useSyncExternalStore(subscribe, getTheme, () => 'dark' as Theme);
  const toggleTheme = useCallback(() => setTheme(getTheme() === 'dark' ? 'light' : 'dark'), []);
  return { theme, setTheme, toggleTheme };
}
