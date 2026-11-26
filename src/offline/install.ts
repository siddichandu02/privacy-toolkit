import { useSyncExternalStore } from 'react';

/** The browser's own install offer (Chrome, Edge, Samsung Internet...). */
export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * - `none`: this browser offers no way to install, or it was turned down lately.
 * - `prompt`: we can show the browser's install dialog.
 * - `ios`: Safari on iPhone/iPad, where it is added from the Share menu by hand.
 * - `installed`: running as the installed app, or just installed.
 */
export type InstallState = 'none' | 'prompt' | 'ios' | 'installed';

const KEY = 'ptk:install-later';
/** "Not now" hides the offer for this long. */
export const LATER_MS = 30 * 24 * 60 * 60 * 1000;

let offer: InstallPromptEvent | null = null;
let installed = false;
let hiddenUntil: number | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function laterUntil(): number {
  if (hiddenUntil !== null) return hiddenUntil;
  try {
    hiddenUntil = Number(localStorage.getItem(KEY)) || 0;
  } catch {
    hiddenUntil = 0;
  }
  return hiddenUntil;
}

const standalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches === true ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** iPhone and iPad Safari (iPadOS says it is a Mac, but has touch). */
export function isIosSafari(ua: string, touchPoints: number): boolean {
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1);
  // Other iOS browsers can add to the home screen too now, but say it differently.
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
}

let state: InstallState = 'none';

function compute(): InstallState {
  if (installed || standalone()) return 'installed';
  if (Date.now() < laterUntil()) return 'none';
  if (offer) return 'prompt';
  if (isIosSafari(navigator.userAgent, navigator.maxTouchPoints)) return 'ios';
  return 'none';
}

function refresh() {
  const next = compute();
  if (next === state) return;
  state = next;
  emit();
}

/**
 * Catch the browser's install offer. Called once at start-up, before the page
 * draws, because the offer can come very early.
 */
export function listenForInstall(target: Window = window) {
  target.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    offer = e as InstallPromptEvent;
    refresh();
  });
  target.addEventListener('appinstalled', () => {
    installed = true;
    offer = null;
    refresh();
  });
  refresh();
}

export const getInstallState = () => state;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(subscribe, getInstallState, () => 'none');
}

/** Show the browser's install dialog. True when it was accepted. */
export async function install(): Promise<boolean> {
  const event = offer;
  if (!event) return false;
  // The offer can only be used once.
  offer = null;
  await event.prompt();
  const { outcome } = await event.userChoice;
  if (outcome === 'accepted') installed = true;
  else remindLater();
  refresh();
  return outcome === 'accepted';
}

/** Hide the offer for a month. */
export function remindLater(now = Date.now()) {
  hiddenUntil = now + LATER_MS;
  try {
    localStorage.setItem(KEY, String(hiddenUntil));
  } catch {
    // Hidden for this visit only.
  }
  refresh();
}

/** For tests. */
export function resetInstall() {
  offer = null;
  installed = false;
  hiddenUntil = null;
  state = 'none';
  listeners.clear();
}
