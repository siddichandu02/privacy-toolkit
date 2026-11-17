import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { resetThemeCache } from '../theme/theme';
import { ThemeToggle } from './ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    resetThemeCache();
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });

  it('names the theme it will switch to and flips on click', async () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: /switch to light theme/i });
    await userEvent.click(button);
    expect(screen.getByRole('button', { name: /switch to dark theme/i })).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('works from the keyboard', async () => {
    render(<ThemeToggle />);
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
