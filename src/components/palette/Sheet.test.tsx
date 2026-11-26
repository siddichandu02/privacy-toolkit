import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, vi } from 'vitest';
import { Sheet } from './Sheet';
import { DISMISS_DISTANCE, shouldDismiss } from './sheetDrag';

function fakeWidth(phone: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: phone && query.includes('max-width'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Sheet', () => {
  it('rises from the bottom with a grip on phones', () => {
    fakeWidth(true);
    render(
      <Sheet label="Things" onClose={() => {}}>
        <p>Inside</p>
      </Sheet>,
    );
    expect(screen.getByRole('dialog', { name: 'Things' })).toHaveAttribute(
      'data-placement',
      'bottom',
    );
    expect(screen.getByTestId('sheet-grip')).toBeInTheDocument();
  });

  it('unfolds from the top on wider screens and when asked to', () => {
    fakeWidth(false);
    const { unmount } = render(
      <Sheet label="Wide" onClose={() => {}}>
        <p>Inside</p>
      </Sheet>,
    );
    expect(screen.getByRole('dialog')).toHaveAttribute('data-placement', 'top');
    expect(screen.queryByTestId('sheet-grip')).not.toBeInTheDocument();
    unmount();

    fakeWidth(true);
    render(
      <Sheet label="Search" onClose={() => {}} phone="top">
        <p>Inside</p>
      </Sheet>,
    );
    expect(screen.getByRole('dialog')).toHaveAttribute('data-placement', 'top');
  });

  it('still closes on Escape as a bottom sheet', async () => {
    fakeWidth(true);
    const onClose = vi.fn();
    render(
      <Sheet label="Things" onClose={onClose}>
        <button type="button">Ok</button>
      </Sheet>,
    );
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes after a long pull or a quick flick, not a small nudge', () => {
    expect(shouldDismiss(DISMISS_DISTANCE + 1, 0)).toBe(true);
    expect(shouldDismiss(40, 900)).toBe(true);
    expect(shouldDismiss(40, 100)).toBe(false);
    expect(shouldDismiss(10, 2000)).toBe(false);
    expect(shouldDismiss(-200, 0)).toBe(false);
  });
});
