import type { ReactNode } from 'react';
import { accentText, type Accent } from './ui/accent';

interface PromiseItem {
  title: string;
  body: string;
  accent: Accent;
  icon: ReactNode;
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

const PROMISES: PromiseItem[] = [
  {
    title: 'Works in this tab',
    body: 'Your browser reads and edits the file. It is never sent to a server.',
    accent: 'mint',
    icon: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="3" {...stroke} />
        <path d="M3 9h18M9 14l2 2 4-4" {...stroke} />
      </>
    ),
  },
  {
    title: 'No sign-up',
    body: 'Open a tool and drop a file in. There is no account to create.',
    accent: 'sky',
    icon: (
      <>
        <circle cx="12" cy="8.5" r="3.5" {...stroke} />
        <path d="M5 19.5c1.2-3.3 3.8-5 7-5s5.8 1.7 7 5M4 4l16 16" {...stroke} />
      </>
    ),
  },
  {
    title: 'Nothing kept',
    body: 'Close the tab and your files are gone. No history, no copies.',
    accent: 'coral',
    icon: (
      <>
        <path d="M6 7h12l-1 12.5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 19.5Z" {...stroke} />
        <path d="M4 7h16M10 7V4.5h4V7M10 11v6M14 11v6" {...stroke} />
      </>
    ),
  },
];

/** Three plain promises in one frosted strip, split by hairlines. */
export function PromiseStrip({ className = '' }: { className?: string }) {
  return (
    <ul
      aria-label="How your files are handled"
      className={`grid overflow-hidden rounded-panel border border-line bg-surface shadow-soft backdrop-blur-xl sm:grid-cols-3 ${className}`}
    >
      {PROMISES.map((p) => (
        <li
          key={p.title}
          className="flex gap-4 border-line p-5 not-last:border-b sm:p-6 sm:not-last:border-r sm:not-last:border-b-0"
        >
          <svg
            viewBox="0 0 24 24"
            className={`mt-0.5 size-6 shrink-0 ${accentText[p.accent]}`}
            aria-hidden="true"
          >
            {p.icon}
          </svg>
          <div>
            <h3 className="font-display text-lg font-bold tracking-tight">{p.title}</h3>
            <p className="mt-1 text-[0.95rem] leading-relaxed text-muted">{p.body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
