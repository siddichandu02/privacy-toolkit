import { useId, type ReactNode } from 'react';
import { Pip } from '../pip/Pip';
import { accentButtonGlow, accentFill, accentText, type Accent } from '../ui/accent';
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
  downloadLabel?: string;
  actions?: DoneAction[];
}

/** The finished result: one big download button and a couple of ways to keep going. */
export function DoneCard({
  accent,
  title,
  fileName,
  blob,
  details,
  downloadLabel = 'Download',
  actions = [],
}: DoneCardProps) {
  const id = useId();
  const url = useObjectUrl(blob);
  const heading = useFocusOnMount<HTMLHeadingElement>();
  return (
    <section aria-labelledby={id} className={resultPanel}>
      <Pip pose="wave" accent={pipFor(accent)} className="mx-auto h-32" />
      <h2
        id={id}
        ref={heading}
        tabIndex={-1}
        className="mt-5 font-display text-3xl font-bold tracking-tight text-balance outline-none sm:text-4xl"
      >
        {title}
      </h2>
      <p className="mt-3 text-muted">
        <span className={`font-semibold break-all ${accentText[accent]}`}>{fileName}</span>
        <br />
        {details} Made on this device, never uploaded.
      </p>
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
