import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionConfig } from 'framer-motion';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listenForInstall, resetInstall, type InstallPromptEvent } from '../../offline/install';
import { InstallSlip } from './InstallSlip';

const ui = () => (
  <MotionConfig reducedMotion="always">
    <InstallSlip />
  </MotionConfig>
);

function offer(outcome: 'accepted' | 'dismissed') {
  const e = new Event('beforeinstallprompt') as InstallPromptEvent;
  e.prompt = vi.fn(async () => {});
  e.userChoice = Promise.resolve({ outcome });
  return e;
}

let target: Window;
beforeEach(() => {
  resetInstall();
  localStorage.clear();
  target = new EventTarget() as Window;
  listenForInstall(target);
});

describe('InstallSlip', () => {
  it('stays hidden where the browser cannot install', () => {
    render(ui());
    expect(screen.queryByTestId('install-slip')).toBeNull();
  });

  it('opens the browser dialog and drops the tile in once added', async () => {
    const user = userEvent.setup();
    render(ui());
    const e = offer('accepted');
    act(() => {
      target.dispatchEvent(e);
    });
    expect(screen.getByRole('heading', { name: 'Install it as an app' })).toBeVisible();
    expect(screen.getByTestId('install-tile')).toHaveAttribute('data-placed', 'false');
    await user.click(screen.getByRole('button', { name: 'Install app' }));
    expect(e.prompt).toHaveBeenCalled();
    expect(await screen.findByRole('heading', { name: 'Added' })).toBeVisible();
    expect(screen.getByTestId('install-tile')).toHaveAttribute('data-placed', 'true');
  });

  it('"Not now" puts it away for a month', async () => {
    const user = userEvent.setup();
    render(ui());
    act(() => {
      target.dispatchEvent(offer('accepted'));
    });
    await user.click(screen.getByRole('button', { name: 'Not now' }));
    await waitFor(() => expect(screen.queryByTestId('install-slip')).toBeNull());
    expect(Number(localStorage.getItem('ptk:install-later'))).toBeGreaterThan(Date.now());
  });

  it('hides again when the dialog is turned down', async () => {
    const user = userEvent.setup();
    render(ui());
    act(() => {
      target.dispatchEvent(offer('dismissed'));
    });
    await user.click(screen.getByRole('button', { name: 'Install app' }));
    await waitFor(() => expect(screen.queryByTestId('install-slip')).toBeNull());
  });
});
