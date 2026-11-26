import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getInstallState,
  install,
  isIosSafari,
  LATER_MS,
  listenForInstall,
  remindLater,
  resetInstall,
  useInstallState,
  type InstallPromptEvent,
} from './install';

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

function offer(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const e = new Event('beforeinstallprompt') as InstallPromptEvent;
  e.prompt = vi.fn(async () => {});
  e.userChoice = Promise.resolve({ outcome });
  return e;
}

beforeEach(() => {
  resetInstall();
  localStorage.clear();
});
afterEach(() => vi.restoreAllMocks());

describe('install offer', () => {
  it('spots Safari on iPhone and iPad, not other iOS browsers', () => {
    expect(isIosSafari(IPHONE, 5)).toBe(true);
    expect(isIosSafari(IPHONE.replace('Version/18.0', 'CriOS/130.0'), 5)).toBe(false);
    const ipad =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
    expect(isIosSafari(ipad, 5)).toBe(true);
    expect(isIosSafari(ipad, 0)).toBe(false);
  });

  it('keeps the browser offer and shows its dialog', async () => {
    const target = new EventTarget() as Window;
    listenForInstall(target);
    const { result } = renderHook(() => useInstallState());
    expect(result.current).toBe('none');
    const e = offer();
    const prevent = vi.spyOn(e, 'preventDefault');
    act(() => {
      target.dispatchEvent(e);
    });
    expect(prevent).toHaveBeenCalled();
    expect(result.current).toBe('prompt');
    await act(async () => {
      expect(await install()).toBe(true);
    });
    expect(e.prompt).toHaveBeenCalled();
    expect(result.current).toBe('installed');
  });

  it('waits a month after the dialog is turned down', async () => {
    const target = new EventTarget() as Window;
    listenForInstall(target);
    target.dispatchEvent(offer('dismissed'));
    expect(await install()).toBe(false);
    expect(getInstallState()).toBe('none');
    expect(Number(localStorage.getItem('ptk:install-later'))).toBeGreaterThan(Date.now());
  });

  it('"Not now" hides it until the month is over', () => {
    const target = new EventTarget() as Window;
    listenForInstall(target);
    remindLater(Date.now() - LATER_MS - 1);
    target.dispatchEvent(offer());
    expect(getInstallState()).toBe('prompt');
    remindLater();
    expect(getInstallState()).toBe('none');
  });

  it('says installed once the app is added', () => {
    const target = new EventTarget() as Window;
    listenForInstall(target);
    target.dispatchEvent(offer());
    target.dispatchEvent(new Event('appinstalled'));
    expect(getInstallState()).toBe('installed');
  });
});
