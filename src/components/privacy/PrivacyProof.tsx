import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { tally, useNetEntries, type NetEntry } from '../../lib/netWatch';
import { useStillMotion } from '../../useStillMotion';
import { formatBytes } from '../drop/validate';
import { useOnline } from './useOnline';

/** The last part of a URL path, e.g. "merge.worker-abc.js". */
function shortName(entry: NetEntry): string {
  const path = new URL(entry.url).pathname;
  const last = path.split('/').filter(Boolean).pop();
  return last ? decodeURIComponent(last) : entry.host;
}

/**
 * Live proof that files stay on the device. Reads the browser's own log of
 * every request this page made: anything to another site would show up here,
 * in coral, with the site's name. The zero is not a promise, it is a reading.
 */
export function PrivacyProof({
  since = 0,
  scope = 'page',
  className = '',
}: {
  /** Only count requests from this performance.now() moment on. */
  since?: number;
  /** Words for what is being counted: the whole visit or this tool. */
  scope?: 'page' | 'tool';
  className?: string;
}) {
  const entries = useNetEntries();
  const online = useOnline();
  const still = useStillMotion();
  const t = tally(entries, since);
  const clean = t.outsideRequests === 0;
  const last = entries.filter((e) => e.at >= since).at(-1);
  const sentBytes = t.outsideBytes;
  const [pulse, setPulse] = useState(0);
  const [seen, setSeen] = useState(entries.length);
  // Each new request gives the reading a little "checked" blink.
  if (seen !== entries.length) {
    setSeen(entries.length);
    setPulse((p) => p + 1);
  }

  return (
    <section
      aria-label="Privacy check"
      data-testid="privacy-proof"
      data-clean={clean}
      className={`relative overflow-hidden rounded-[22px] border bg-surface shadow-soft backdrop-blur-xl ${
        clean ? 'border-mint/30' : 'border-coral/50'
      } ${className}`}
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4 p-5 sm:p-6">
        <div className="flex items-baseline gap-3">
          <motion.span
            key={pulse}
            initial={still ? false : { scale: 1.12 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 18 }}
            className={`font-display text-6xl leading-none font-extrabold tracking-[-0.04em] tabular-nums sm:text-7xl ${
              clean ? 'text-mint' : 'text-coral'
            }`}
            data-testid="bytes-sent"
          >
            {clean ? '0' : formatBytes(sentBytes)}
          </motion.span>
          <span className="max-w-[9rem] text-sm leading-snug font-semibold text-fg">
            {clean ? 'bytes' : ''} sent to other sites
          </span>
        </div>

        <div className="min-w-0 flex-1 basis-60 text-sm leading-relaxed text-muted">
          <p className="flex items-center gap-2 font-semibold text-fg">
            <span className="relative flex size-2.5" aria-hidden="true">
              {still ? null : (
                <span
                  className={`absolute inset-0 animate-ping rounded-full opacity-60 ${
                    clean ? 'bg-mint' : 'bg-coral'
                  }`}
                />
              )}
              <span
                className={`relative size-2.5 rounded-full ${clean ? 'bg-mint' : 'bg-coral'}`}
              />
            </span>
            {clean ? 'Checked live, still zero' : `Requests to ${t.outsideHosts.join(', ')}`}
          </p>
          <p className="mt-1">
            {t.appRequests === 0
              ? `Nothing has been loaded ${scope === 'tool' ? 'by this tool' : 'yet'}.`
              : `${t.appRequests} ${t.appRequests === 1 ? 'file' : 'files'} (${formatBytes(
                  t.appBytes,
                )}) came from this site ${scope === 'tool' ? 'since you opened this tool' : 'so far'}: the app's own code, coming to you.`}
          </p>
          <p className="mt-1 truncate" aria-live="polite" data-testid="last-request">
            {last ? (
              <>
                Last request: <span className="font-medium text-fg">{shortName(last)}</span>
                {last.kind === 'app' ? ', from this site' : `, to ${last.host}`}
              </>
            ) : null}
          </p>
        </div>
      </div>

      <AnimatePresence initial={false} mode="wait">
        <motion.p
          key={online ? 'on' : 'off'}
          initial={still ? { opacity: 0 } : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`flex items-center gap-2.5 border-t px-5 py-3 text-sm font-medium sm:px-6 ${
            online ? 'border-line text-muted' : 'border-sky/30 bg-sky/10 text-fg'
          }`}
          data-testid="offline-tip"
        >
          <WifiIcon off={!online} />
          {online
            ? 'Try it: add your files, turn off your Wi-Fi, then press the button. It still works.'
            : "You're offline. The tools keep working, because they never needed the internet."}
        </motion.p>
      </AnimatePresence>
    </section>
  );
}

function WifiIcon({ off }: { off: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`size-5 shrink-0 ${off ? 'text-sky' : 'text-muted'}`}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.7 16a5 5 0 0 1 6.6 0" />
      <circle cx="12" cy="19.2" r="1.1" fill="currentColor" stroke="none" />
      {off ? <path d="M4 3.5 20 20.5" /> : null}
    </svg>
  );
}
