import { Link } from 'react-router-dom';
import { GitHubIcon, REPO_URL } from './Header';

const PROMISES = ['Stays on your device', 'No tracking', 'No accounts'];

export function Footer() {
  return (
    <footer className="relative z-10 mt-24 border-t border-line pb-[env(safe-area-inset-bottom)] later [contain-intrinsic-size:auto_200px]">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-8 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="font-display text-2xl leading-tight font-bold tracking-tight text-balance sm:text-3xl">
            Your files are yours. We never see them.
          </p>
          <ul
            className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted"
            aria-label="Our promise"
          >
            {PROMISES.map((p) => (
              <li key={p} className="flex items-center gap-2">
                <svg viewBox="0 0 16 16" className="size-4 text-mint" aria-hidden="true">
                  <path
                    d="m3.5 8.5 3 3 6-7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
          <Link to="/" className="rounded-md transition-colors hover:text-fg">
            All tools
          </Link>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md transition-colors hover:text-fg"
          >
            <GitHubIcon className="size-4" />
            Source on GitHub
          </a>
          <a
            href={`${REPO_URL}/blob/main/LICENSE`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md transition-colors hover:text-fg"
          >
            MIT license
          </a>
        </div>
      </div>
    </footer>
  );
}
