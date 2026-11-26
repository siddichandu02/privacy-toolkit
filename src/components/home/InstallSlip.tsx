import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { install, remindLater, useInstallState } from '../../offline/install';
import { useOfflineState } from '../../offline/offline';
import { IosSteps } from '../install/IosSteps';
import { Button } from '../ui';

const touchScreen = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true;

/** Our folded mark, as the app tile. */
function Mark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="15" fill="#15123A" />
      <path d="M18 46V22l14-8 14 8v24l-14-8z" fill="#7C5CFF" />
      <path d="M32 14v24l14 8V22z" fill="#FF6B8B" />
    </svg>
  );
}

/**
 * A phone screen with an empty slot. The tile leans toward the slot on hover
 * and drops into it once the app is added.
 */
function HomeScreen({ placed, leaning }: { placed: boolean; leaning: boolean }) {
  const reduced = useReducedMotion();
  const spring = { type: 'spring' as const, stiffness: 420, damping: 18 };
  // Tile resting above the phone, its slot, and halfway between.
  const rest = { x: 34, y: -30, rotate: -12, scale: 1.08 };
  const lean = { x: 20, y: -14, rotate: -6, scale: 1.04 };
  const home = { x: 0, y: 0, rotate: 0, scale: 1 };
  return (
    <div
      className="relative mx-auto h-40 w-28 shrink-0 sm:mx-0 sm:ml-2 sm:h-44 sm:w-32"
      aria-hidden="true"
    >
      <div className="absolute inset-0 rounded-[1.6rem] border-2 border-line-strong bg-canvas-raised/70 shadow-soft">
        <div className="mx-auto mt-2 h-1.5 w-8 rounded-full bg-line-strong" />
        <div className="grid grid-cols-3 gap-2 p-3 pt-4">
          {Array.from({ length: 9 }, (_, i) =>
            i === 4 ? (
              <div
                key={i}
                className={`relative aspect-square rounded-lg border-2 border-dashed transition-colors ${placed ? 'border-transparent' : 'border-violet/60'}`}
              >
                <motion.div
                  className="absolute inset-0"
                  initial={false}
                  animate={reduced || placed ? home : leaning ? lean : rest}
                  transition={reduced ? { duration: 0 } : spring}
                  style={{ opacity: reduced && !placed ? 0.85 : 1 }}
                  data-testid="install-tile"
                  data-placed={placed}
                >
                  <Mark className="size-full drop-shadow-[0_6px_10px_rgb(124_92_255/0.45)]" />
                </motion.div>
              </div>
            ) : (
              <div key={i} className="aspect-square rounded-lg bg-surface-strong" />
            ),
          )}
        </div>
      </div>
    </div>
  );
}

function OfflineLine() {
  const offline = useOfflineState();
  if (offline === 'off') return null;
  return (
    <p className="mt-3 text-sm text-muted" data-testid="offline-status">
      <span
        className={`mr-2 inline-block size-2 -translate-y-px rounded-full align-middle ${offline === 'ready' ? 'bg-mint' : 'animate-pulse bg-sunshine motion-reduce:animate-none'}`}
        aria-hidden="true"
      />
      <span>
        {offline === 'ready'
          ? 'Already saved on this device, so every tool works offline in this browser too.'
          : 'Saving the tools on this device for offline use...'}
      </span>
    </p>
  );
}

/**
 * Offer to add the toolkit to the home screen or as a desktop app. Shown only
 * where the browser can do it; "Not now" hides it for a month.
 */
export function InstallSlip({ className = '' }: { className?: string }) {
  const state = useInstallState();
  const reduced = useReducedMotion();
  const [added, setAdded] = useState(false);
  const [leaning, setLeaning] = useState(false);
  const [busy, setBusy] = useState(false);
  const phone = state === 'ios' || touchScreen();
  const show = added || state === 'prompt' || state === 'ios';

  const onInstall = async () => {
    setBusy(true);
    try {
      if (await install()) setAdded(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence initial={false}>
      {show ? (
        <motion.section
          key="install"
          aria-labelledby="install-heading"
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          onHoverStart={() => setLeaning(true)}
          onHoverEnd={() => setLeaning(false)}
          onFocus={() => setLeaning(true)}
          onBlur={() => setLeaning(false)}
          className={`relative overflow-hidden rounded-panel border border-line bg-surface p-6 shadow-soft backdrop-blur-xl sm:p-8 ${className}`}
          data-testid="install-slip"
        >
          <div
            className="pointer-events-none absolute -top-24 -left-16 size-72 rounded-full bg-violet/15 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative flex flex-col items-center gap-8 sm:flex-row sm:items-center sm:gap-10">
            <HomeScreen placed={added} leaning={leaning || busy} />
            <div className="max-w-xl min-w-0 text-center sm:text-left" aria-live="polite">
              {added ? (
                <>
                  <h2
                    id="install-heading"
                    className="font-display text-2xl font-bold tracking-tight sm:text-3xl"
                  >
                    Added
                  </h2>
                  <p className="mt-2 leading-relaxed text-muted">
                    {phone
                      ? 'Privacy Toolkit is on your home screen now. It opens in its own window and works offline.'
                      : 'Privacy Toolkit is in your apps now. It opens in its own window and works offline.'}
                  </p>
                </>
              ) : (
                <>
                  <h2
                    id="install-heading"
                    className="font-display text-2xl font-bold tracking-tight sm:text-3xl"
                  >
                    {phone ? 'Keep it on your home screen' : 'Install it as an app'}
                  </h2>
                  <p className="mt-2 leading-relaxed text-muted">
                    It opens in its own window and works with no connection, even on a plane. Your
                    files still never leave your device.
                  </p>
                  {state === 'ios' ? <IosSteps className="mt-4" /> : null}
                  <OfflineLine />
                  <div className="mt-5 flex flex-wrap justify-center gap-3 sm:justify-start">
                    {state === 'prompt' ? (
                      <Button onClick={() => void onInstall()} disabled={busy}>
                        {phone ? 'Add to home screen' : 'Install app'}
                      </Button>
                    ) : null}
                    <Button variant="ghost" onClick={() => remindLater()}>
                      {state === 'ios' ? 'Got it' : 'Not now'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}
