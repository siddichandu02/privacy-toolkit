import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ThemeToggle } from '../ThemeToggle';
import { WordmarkIcon } from './Wordmark';

export const REPO_URL = 'https://github.com/siddichandu02/privacy-toolkit';

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
      className={`sticky top-0 z-30 border-b transition-[background-color,border-color,backdrop-filter] duration-300 ${
        scrolled
          ? 'border-line bg-canvas/70 backdrop-blur-xl backdrop-saturate-150'
          : 'border-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:h-20 sm:px-8">
        <Link
          to="/"
          className="group mr-auto flex items-center gap-2.5 rounded-xl"
          aria-label="Privacy Toolkit, home"
        >
          <motion.span
            className="flex items-center gap-2.5"
            initial="rest"
            animate="rest"
            whileHover={reduced ? undefined : 'hover'}
          >
            <WordmarkIcon className="size-8 drop-shadow-[0_4px_12px_rgb(124_92_255/0.35)]" />
            <span className="font-display text-lg leading-none font-bold tracking-tight sm:text-xl">
              Privacy Toolkit
            </span>
          </motion.span>
        </Link>
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
            className="grid size-11 place-items-center rounded-full text-muted transition-colors hover:text-fg"
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

export function GitHubIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.58 9.58 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
    </svg>
  );
}
