import { motion } from 'framer-motion';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PaperBall } from '../components/notfound/PaperBall';
import { Pip } from '../components/pip/Pip';
import { accentDot } from '../components/ui/accent';
import { TOOLS, toolPath } from '../tools';
import { useDocumentTitle } from '../useDocumentTitle';
import { useStillMotion } from '../useStillMotion';
import { nearTools } from './nearTools';

export default function NotFound() {
  useDocumentTitle('Page not found');
  const { pathname } = useLocation();
  const still = useStillMotion();
  const [open, setOpen] = useState(false);
  const near = nearTools(pathname, TOOLS);

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-4 pt-12 pb-24 text-center sm:px-8 sm:pt-16">
      <div className="flex items-end gap-4 sm:gap-6">
        <div className="font-display text-[clamp(5rem,20vw,9rem)] leading-none font-extrabold tracking-[-0.05em]">
          <span aria-hidden="true">4</span>
          <PaperBall open={open} onToggle={() => setOpen((o) => !o)} />
          <span aria-hidden="true">4</span>
        </div>
        <Pip pose={open ? 'celebrate' : 'puzzled'} watch className="mb-1 h-24 shrink-0 sm:h-32" />
      </div>
      <p className="mt-3 text-sm text-muted" aria-live="polite">
        {open ? 'Found the way back.' : 'Tap the crumpled page to unfold it.'}
      </p>
      <h1 className="mt-8 font-display text-4xl leading-tight font-extrabold tracking-tight text-balance sm:text-5xl">
        This page folded itself away.
      </h1>
      <p className="mt-4 max-w-md text-lg text-muted">
        The link might be old or mistyped. Every tool is still one click away.
      </p>

      {near.length > 0 ? (
        <nav aria-label="Did you mean" className="mt-8">
          <p className="text-sm font-semibold text-muted">Did you mean</p>
          <ul className="mt-3 flex flex-wrap justify-center gap-2">
            {near.map((t, i) => (
              <motion.li
                key={t.id}
                initial={still ? false : { opacity: 0, y: 10, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.15 + i * 0.07 }}
              >
                <Link
                  to={toolPath(t.id)}
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-line-strong bg-surface px-4 font-semibold shadow-soft backdrop-blur-xl transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lifted active:translate-y-0 active:scale-95"
                >
                  <span
                    aria-hidden="true"
                    className={`size-2 rounded-full ${accentDot[t.accent]}`}
                  />
                  {t.name}
                </Link>
              </motion.li>
            ))}
          </ul>
        </nav>
      ) : null}

      <motion.div
        className="mt-8"
        animate={open && !still ? { scale: [1, 1.08, 1] } : { scale: 1 }}
        transition={{ duration: 0.45, delay: 0.5 }}
      >
        <Link
          to="/"
          className="inline-flex h-11 items-center rounded-control bg-violet-fill px-5 font-semibold text-on-violet shadow-soft transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-glow-violet active:translate-y-0 active:scale-95"
        >
          Back to all tools
        </Link>
      </motion.div>
    </div>
  );
}
