import { act, renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { STORAGE_KEY, resetThemeCache } from './theme';
import { useTheme } from './useTheme';

function mockSystem(prefersLight: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('light') ? prefersLight : !prefersLight,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    resetThemeCache();
    delete document.documentElement.dataset.theme;
    mockSystem(false);
  });

  it('defaults to dark when the system has no light preference', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
  });

  it('follows a light system preference when nothing is saved', () => {
    mockSystem(true);
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
  });

  it('prefers the saved choice over the system setting', () => {
    mockSystem(true);
    localStorage.setItem(STORAGE_KEY, 'dark');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
  });

  it('toggles, saves the choice and updates <html>', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('light');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('keeps working when storage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme('light'));
    expect(result.current.theme).toBe('light');
    spy.mockRestore();
  });
});
