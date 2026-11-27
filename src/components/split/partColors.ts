import type { Accent } from '../ui/accent';

const ORDER: readonly Accent[] = ['coral', 'sky', 'mint', 'sunshine', 'violet'];

/** The accent for output file `index` (0-based), starting from the tool's own. */
export function partAccent(index: number, first: Accent): Accent {
  const start = Math.max(0, ORDER.indexOf(first));
  return ORDER[(start + index) % ORDER.length] ?? first;
}

/** Same, as a CSS colour for inline styles. */
export const partColor = (index: number, first: Accent) => `var(--${partAccent(index, first)})`;
