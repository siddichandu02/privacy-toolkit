import { forwardRef, type HTMLAttributes } from 'react';
import { accentGlow, type Accent } from './accent';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds a soft colored glow on hover and focus. */
  accent?: Accent;
  /** Larger radius and padding for page-level panels. */
  size?: 'card' | 'panel';
}

/** Frosted glass surface. In light mode it becomes a clean white sheet. */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { accent, size = 'card', className = '', children, ...rest },
  ref,
) {
  const shape = size === 'panel' ? 'rounded-panel p-6 sm:p-8' : 'rounded-card p-5';
  const glow = accent ? `transition-shadow duration-300 ${accentGlow[accent]}` : '';
  return (
    <div
      ref={ref}
      className={`relative border border-line bg-surface shadow-soft backdrop-blur-xl ${shape} ${glow} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
});
