import type { HTMLAttributes } from 'react';
import { accentDot, accentSoft, type Accent } from './accent';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  accent?: Accent;
  /** Small status dot before the label. */
  dot?: boolean;
}

export function Badge({ accent, dot = false, className = '', children, ...rest }: BadgeProps) {
  const tone = accent ? accentSoft[accent] : 'border-line bg-surface text-muted';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold backdrop-blur-md ${tone} ${className}`}
      {...rest}
    >
      {dot ? (
        <span
          className={`size-1.5 rounded-full ${accent ? accentDot[accent] : 'bg-mint'}`}
          aria-hidden="true"
        />
      ) : null}
      {children}
    </span>
  );
}
