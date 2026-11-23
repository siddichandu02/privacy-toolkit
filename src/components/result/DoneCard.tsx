import { FileName } from './FileName';
import { motion } from 'framer-motion';
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useStillMotion } from '../../useStillMotion';
import { Pip } from '../pip/Pip';
import { accentButtonGlow, accentFill, accentText, type Accent } from '../ui/accent';
import { PaperConfetti } from './PaperConfetti';
import { pipFor, resultPanel } from './panel';
import { useFocusOnMount } from './useFocusOnMount';
import { useObjectUrl } from './useObjectUrl';

export interface DoneAction {
  label: string;
  onClick: () => void;
}

export interface DoneCardProps {
  accent: Accent;
  title: string;
  fileName: string;
  blob: Blob;
  /** One plain line under the file name, e.g. "3 files joined, 1.2 MB." */
  details: ReactNode;
  /** Shown between the details and the download button, e.g. a size chart. */
  extra?: ReactNode;
  downloadLabel?: string;
  actions?: DoneAction[];
}

type Phase = 'sealed' | 'flipping' | 'open';

/** How long the sealed envelope shows before it turns over. */
export const SEAL_MS = 750;
/** Safety net in case the flip animation never reports back. */
const OPEN_FALLBACK_MS = SEAL_MS + 1200;

/**
 * The finished result. It lands as a sealed paper envelope, turns over with a
 * burst of folded confetti, and shows one big download button. With reduced
 * motion it simply fades in already open.
 */
export function DoneCard({
  accent,
  title,
  fileName,
  blob,
  details,
  extra,
  downloadLabel = 'Download',
  actions = [],
}: DoneCardProps) {
  const id = useId();
  const still = useStillMotion();
  const url = useObjectUrl(blob);
  const [phase, setPhase] = useState<Phase>(still ? 'open' : 'sealed');
  const open = phase === 'open';
  const heading = useFocusOnMount<HTMLHeadingElement>(open);
  const back = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (still) return;
    const flip = setTimeout(() => setPhase((p) => (p === 'sealed' ? 'flipping' : p)), SEAL_MS);
    const done = setTimeout(() => setPhase('open'), OPEN_FALLBACK_MS);
    return () => {
      clearTimeout(flip);
      clearTimeout(done);
    };
  }, [still]);

  // Keep the download face out of the tab order until it is facing the visitor.
  // A layout effect, so inert is lifted before the heading tries to take focus.
  useLayoutEffect(() => {
    if (back.current) back.current.inert = !open;
  }, [open]);

  return (
    <div className="relative [perspective:1400px]" data-phase={phase}>
      <motion.div
        className="relative grid [transform-style:preserve-3d]"
        initial={false}
        animate={{ rotateY: still || phase === 'sealed' ? 0 : 180 }}
        transition={{ type: 'spring', stiffness: 120, damping: 15, mass: 0.9 }}
        onAnimationComplete={() => setPhase((p) => (p === 'flipping' ? 'open' : p))}
      >
        {still || open ? null : <SealedFace accent={accent} fileName={fileName} />}
        <div
          ref={back}
          className={`[backface-visibility:hidden] [grid-area:1/1] ${still ? '' : '[transform:rotateY(180deg)]'}`}
        >
          <section aria-labelledby={id} className={resultPanel}>
            <Pip pose="celebrate" accent={pipFor(accent)} className="mx-auto h-32" />
            <h2
              id={id}
              ref={heading}
              tabIndex={-1}
              className="mt-5 font-display text-3xl font-bold tracking-tight text-balance outline-none sm:text-4xl"
            >
              {title}
            </h2>
            <p className="mt-3 text-muted">
              <FileName name={fileName} className={`font-semibold ${accentText[accent]}`} />
              <br />
              {details} Made on this device, never sent anywhere.
            </p>
            {extra}
            <a
              href={url ?? undefined}
              download={fileName}
              className={`mt-7 inline-flex h-14 items-center justify-center gap-2.5 rounded-[1.125rem] px-8 text-lg font-semibold shadow-soft transition-[box-shadow,translate,scale] duration-200 hover:-translate-y-0.5 active:scale-95 ${accentFill[accent]} ${accentButtonGlow[accent]}`}
            >
              <DownloadIcon />
              {downloadLabel}
            </a>
            {actions.length > 0 ? (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-semibold">
                {actions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={action.onClick}
                    className="rounded-lg text-muted transition-colors hover:text-fg"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      </motion.div>
      <PaperConfetti accent={accent} burst={phase === 'sealed' ? 0 : 1} className="top-16 z-10" />
    </div>
  );
}

/**
 * The face you see first: the back of a paper envelope. Its flap folds down
 * and a seal stamps on before the card turns over.
 */
function SealedFace({ accent, fileName }: { accent: Accent; fileName: string }) {
  const color = `var(--${accent})`;
  const light = `color-mix(in srgb, var(--${accent}) 55%, white)`;
  const shade = `color-mix(in srgb, var(--${accent}) 70%, #1b1033)`;
  return (
    <div
      aria-hidden="true"
      data-testid="sealed-face"
      className={`${resultPanel} flex flex-col items-center justify-center [backface-visibility:hidden] [grid-area:1/1]`}
    >
      <svg viewBox="0 0 200 140" className="w-48 sm:w-56" overflow="visible">
        <rect x="10" y="20" width="180" height="110" rx="10" fill={light} />
        <polygon points="10,130 100,70 190,130" fill={color} />
        <polygon points="10,24 100,88 10,130" fill={shade} opacity="0.55" />
        <polygon points="190,24 100,88 190,130" fill={shade} opacity="0.4" />
        <motion.polygon
          points="10,22 190,22 100,92"
          fill={color}
          style={{ originX: '100px', originY: '22px' }}
          initial={{ scaleY: -1 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.32, ease: [0.3, 0.7, 0.4, 1.4] }}
        />
        <motion.g
          initial={{ scale: 1.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{ originX: '100px', originY: '88px' }}
          transition={{ delay: 0.34, type: 'spring', stiffness: 520, damping: 16 }}
        >
          <circle cx="100" cy="88" r="17" fill="var(--canvas)" />
          <circle cx="100" cy="88" r="13" fill="none" stroke={color} strokeWidth="2.5" />
          <path
            d="M93 88.5 98 93.5 107.5 83"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.g>
      </svg>
      <p className="mt-6 max-w-full truncate px-4 font-display text-xl font-semibold tracking-tight">
        Sealing {fileName}
      </p>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 3v10m-4-4 4 4 4-4M4 16.5h12" />
    </svg>
  );
}
