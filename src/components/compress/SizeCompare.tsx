import { motion } from 'framer-motion';
import { savedPercent } from '../../lib/pdf/file-names';
import { useStillMotion } from '../../useStillMotion';
import { formatBytes } from '../drop/validate';
import { accentDot, accentText, type Accent } from '../ui/accent';

export interface SizeCompareProps {
  before: number;
  after: number;
  accent: Accent;
}

/**
 * Two bars, old size and new size, drawn to scale. The new bar shrinks in
 * from full width so you can watch the file get smaller.
 */
export function SizeCompare({ before, after, accent }: SizeCompareProps) {
  const still = useStillMotion();
  const percent = savedPercent(before, after);
  const share = before > 0 ? Math.max(0.02, after / before) : 1;

  return (
    <figure
      className="mx-auto mt-6 w-full max-w-sm text-left"
      aria-label={`${formatBytes(before)} before, ${formatBytes(after)} after, ${percent}% smaller`}
      data-testid="size-compare"
    >
      <div className="flex items-baseline gap-2.5">
        <span className={`font-display text-5xl leading-none font-extrabold ${accentText[accent]}`}>
          {percent}%
        </span>
        <span className="text-muted">smaller than before</span>
      </div>
      <div className="mt-4 grid grid-cols-[3.25rem_1fr_auto] items-center gap-x-3 gap-y-2 text-sm">
        <span className="text-muted">Before</span>
        <span className="h-3 rounded-full bg-line-strong" />
        <span className="text-right text-muted tabular-nums">{formatBytes(before)}</span>
        <span className="font-semibold text-fg">After</span>
        <span className="h-3 rounded-full bg-line">
          <motion.span
            className={`block h-full rounded-full ${accentDot[accent]}`}
            initial={still ? false : { width: '100%' }}
            animate={{ width: `${share * 100}%` }}
            transition={
              still ? { duration: 0 } : { delay: 0.35, type: 'spring', stiffness: 90, damping: 16 }
            }
          />
        </span>
        <span className="text-right font-semibold text-fg tabular-nums">{formatBytes(after)}</span>
      </div>
    </figure>
  );
}
