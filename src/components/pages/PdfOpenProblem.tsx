import { FileName } from '../result/FileName';
import { useId } from 'react';
import { Pip } from '../pip/Pip';
import { pipFor } from '../result/panel';
import type { Accent } from '../ui/accent';

interface PdfOpenProblemProps {
  name: string;
  /** True when the file asks for a password; otherwise it could not be read. */
  locked: boolean;
  accent: Accent;
}

/**
 * Shown in place of a tool's page picker when the PDF won't open. A locked
 * file gets the steps to make an unlocked copy; a broken one gets a plain
 * explanation. Either way the file list above has a Remove button.
 */
export function PdfOpenProblem({ name, locked, accent }: PdfOpenProblemProps) {
  const id = useId();
  return (
    <section
      role="alert"
      aria-labelledby={id}
      className="relative grid gap-5 overflow-hidden rounded-panel border border-coral/30 bg-surface p-5 shadow-soft backdrop-blur-xl sm:grid-cols-[auto_1fr] sm:gap-7 sm:p-7"
    >
      <div className="relative mx-auto w-24 self-start sm:mx-0 sm:w-28">
        <Pip pose="puzzled" accent={pipFor(accent)} className="w-full" />
        {locked ? <PaperLock /> : null}
      </div>
      <div className="min-w-0">
        <h2 id={id} className="font-display text-2xl font-bold tracking-tight text-balance">
          {locked ? 'This PDF has a password' : 'This PDF could not be opened'}
        </h2>
        <p className="mt-2 text-muted">
          {locked ? (
            <>
              <FileName name={name} className="font-semibold text-fg" /> is locked, so its pages
              can't be read here. Make an unlocked copy, then add that instead:
            </>
          ) : (
            <>
              <FileName name={name} className="font-semibold text-fg" /> may be damaged or not
              really a PDF. Try opening it in another app, or pick a different file.
            </>
          )}
        </p>
        {locked ? (
          <ol className="mt-4 grid gap-2 text-sm">
            {[
              'Open it in your PDF reader and type the password.',
              'Choose Print, then "Save as PDF" as the printer.',
              'Remove this file above and add the new copy.',
            ].map((step, i) => (
              <li key={step} className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="grid size-6 shrink-0 place-items-center rounded-full border border-line bg-surface-strong font-display text-xs font-bold"
                >
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </section>
  );
}

/** A little folded-paper padlock tag hanging off Pip's side. */
function PaperLock() {
  return (
    <svg
      viewBox="0 0 40 48"
      aria-hidden="true"
      data-testid="paper-lock"
      className="absolute -right-2 bottom-1 w-9 origin-top -rotate-12 drop-shadow-md motion-safe:animate-[lock-sway_3.2s_ease-in-out_infinite]"
    >
      <path
        d="M12 22v-7a8 8 0 0 1 16 0v7"
        fill="none"
        stroke="var(--muted)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path d="M5 21h30l-2 25H7z" fill="var(--sunshine)" />
      <path d="M5 21h15l-1 25H7z" fill="#000" opacity="0.08" />
      <circle cx="20" cy="31" r="3.2" fill="var(--canvas)" opacity="0.7" />
      <path d="M20 33v6" stroke="var(--canvas)" strokeWidth="2.4" opacity="0.7" />
    </svg>
  );
}
