import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { modKey, openOverlay } from '../palette/store';
import { ThemeToggle } from '../ThemeToggle';
import { Wordmark, WordmarkIcon } from './Wordmark';

export const REPO_URL = 'https://github.com/siddichandu02/pdfpip';

/** Sticky top bar. It stays transparent at the top and frosts once you scroll. */
export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-30 border-b pt-[env(safe-area-inset-top)] transition-[background-color,border-color,backdrop-filter] duration-300 ${
        scrolled
          ? 'border-line bg-canvas/70 backdrop-blur-xl backdrop-saturate-150'
          : 'border-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:h-20 sm:px-8">
        <Link
          to="/"
          className="group tap mr-auto flex items-center gap-2.5 rounded-xl"
          aria-label="PDFPip, home"
        >
          <motion.span
            className="flex items-center gap-2.5"
            initial="rest"
            animate="rest"
            whileHover={reduced ? undefined : 'hover'}
          >
            <WordmarkIcon className="size-9 drop-shadow-[0_4px_12px_rgb(255_107_139/0.35)]" />
            <Wordmark className="text-xl sm:text-2xl" />
          </motion.span>
        </Link>
        <SearchButton />
        <nav aria-label="Main" className="flex items-center gap-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `hidden rounded-xl px-3 py-2 text-sm font-semibold transition-colors sm:block ${
                isActive ? 'text-fg' : 'text-muted hover:text-fg'
              }`
            }
          >
            Tools
          </NavLink>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="hidden size-11 place-items-center rounded-full text-muted transition-colors hover:text-fg sm:grid"
            aria-label="Source code on GitHub (opens in a new tab)"
          >
            <GitHubIcon className="size-5" />
          </a>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}

/** Opens the tool search. Shows the shortcut on wider screens. */
function SearchButton() {
  const [mod] = useState(modKey);
  return (
    <button
      type="button"
      onClick={() => openOverlay('palette')}
      aria-label="Search tools"
      aria-keyshortcuts="Control+K Meta+K"
      aria-haspopup="dialog"
      className="group flex h-11 cursor-pointer items-center gap-2 rounded-full px-3 text-muted transition-colors hover:text-fg sm:border sm:border-line sm:bg-surface sm:pr-2 sm:pl-3.5 sm:hover:border-line-strong"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 sm:size-4">
        <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="hidden text-sm font-semibold md:inline">Find a tool</span>
      <kbd className="hidden rounded-md border border-line px-1.5 py-0.5 font-sans text-xs font-semibold sm:inline">
        {mod} K
      </kbd>
    </button>
  );
}

export function GitHubIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.58 9.58 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
    </svg>
  );
}
