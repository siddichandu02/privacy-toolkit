import type { MouseEvent } from 'react';

export const MAIN_ID = 'main';

/**
 * First focusable element on the page. A plain "#main" href would be read as
 * a route by the hash router, so focus is moved by hand instead.
 */
export function SkipLink() {
  const skip = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const main = document.getElementById(MAIN_ID);
    main?.focus();
    main?.scrollIntoView();
  };

  return (
    <a
      href={`#${MAIN_ID}`}
      onClick={skip}
      className="fixed top-3 left-3 z-50 -translate-y-24 rounded-control bg-violet-fill px-4 py-2.5 font-semibold text-on-violet shadow-lifted transition-transform focus-visible:translate-y-0"
    >
      Skip to content
    </a>
  );
}
