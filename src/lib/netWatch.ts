import { useSyncExternalStore } from 'react';

/**
 * Watches every network request this page makes, using the browser's own
 * Resource Timing records. Nothing here can send anything: it only reads what
 * the browser already logged.
 *
 * Requests are split in two:
 * - `app`: files from this site (the scripts, styles and fonts of the app itself).
 * - `outside`: anything to another site. This should always stay at zero.
 * Local `blob:` and `data:` URLs never touch the network and are skipped.
 */

export type NetKind = 'app' | 'outside';

export interface NetEntry {
  url: string;
  host: string;
  kind: NetKind;
  /** Bytes over the wire when the browser reports it, else the body size. */
  bytes: number;
  /** performance.now() time the request started. */
  at: number;
}

export interface NetTally {
  appRequests: number;
  appBytes: number;
  outsideRequests: number;
  outsideBytes: number;
  outsideHosts: string[];
}

interface TimingLike {
  name: string;
  startTime: number;
  transferSize?: number;
  encodedBodySize?: number;
}

/** Turn one timing record into an entry, or null when it never left the device. */
export function toEntry(timing: TimingLike, origin: string): NetEntry | null {
  let url: URL;
  try {
    url = new URL(timing.name, origin);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  const kind: NetKind = url.origin === origin ? 'app' : 'outside';
  const bytes = timing.transferSize || timing.encodedBodySize || 0;
  // A request to another site always counts, even if the browser hides its size.
  return {
    url: url.href,
    host: url.host,
    kind,
    bytes: kind === 'outside' ? Math.max(bytes, 1) : bytes,
    at: timing.startTime,
  };
}

/** Add up entries, optionally only those that started at or after `since`. */
export function tally(entries: readonly NetEntry[], since = 0): NetTally {
  const out: NetTally = {
    appRequests: 0,
    appBytes: 0,
    outsideRequests: 0,
    outsideBytes: 0,
    outsideHosts: [],
  };
  for (const e of entries) {
    if (e.at < since) continue;
    if (e.kind === 'app') {
      out.appRequests += 1;
      out.appBytes += e.bytes;
    } else {
      out.outsideRequests += 1;
      out.outsideBytes += e.bytes;
      if (!out.outsideHosts.includes(e.host)) out.outsideHosts.push(e.host);
    }
  }
  return out;
}

let entries: NetEntry[] = [];
let started = false;
const listeners = new Set<() => void>();

function record(list: readonly TimingLike[]) {
  const origin = window.location.origin;
  const fresh = list.map((t) => toEntry(t, origin)).filter((e): e is NetEntry => e !== null);
  if (fresh.length === 0) return;
  entries = [...entries, ...fresh];
  listeners.forEach((l) => l());
}

/** Start watching once. Safe to call many times and in browsers without the API. */
export function startNetWatch() {
  if (started || typeof window === 'undefined') return;
  started = true;
  if (typeof PerformanceObserver === 'undefined') return;
  try {
    // `buffered` replays everything logged before the observer started.
    new PerformanceObserver((list) => record(list.getEntries())).observe({
      type: 'resource',
      buffered: true,
    });
  } catch {
    // Very old browsers: fall back to one snapshot.
    record(performance.getEntriesByType('resource'));
  }
}

function subscribe(listener: () => void) {
  startNetWatch();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const snapshot = () => entries;

/** Every request seen so far. Re-renders when a new one arrives. */
export function useNetEntries(): readonly NetEntry[] {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/** Test helper: forget everything and feed records in directly. */
export const __test = {
  reset() {
    entries = [];
    started = false;
    listeners.clear();
  },
  record,
};
