import type { Accent } from '../ui/accent';

/** Shared shell for the result cards so done and error screens sit the same way. */
export const resultPanel =
  'relative overflow-hidden rounded-panel border border-line bg-surface px-6 py-8 text-center shadow-lifted backdrop-blur-xl sm:px-10 sm:py-10';

/** Pip is never violet on a violet page; coral reads better there. */
export const pipFor = (accent: Accent): Accent => (accent === 'violet' ? 'coral' : accent);
