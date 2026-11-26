import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';
import { forwardRef, useState, type ReactNode } from 'react';
import { accentButtonGlow, accentFill, type Accent } from './accent';

type Variant = 'primary' | 'ghost' | 'accent';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant;
  size?: Size;
  /** Only used by the "accent" variant; matches the tool's color. */
  accent?: Accent;
  icon?: ReactNode;
  children?: ReactNode;
}

const sizes: Record<Size, string> = {
  sm: 'h-9 gap-1.5 px-3.5 text-sm rounded-xl pointer-coarse:h-11',
  md: 'h-11 gap-2 px-5 text-[0.95rem] rounded-control',
  lg: 'h-14 gap-2.5 px-7 text-lg rounded-[1.125rem]',
};

// The hover lift moves the button up 2px. While hovered, a thin strip under it
// keeps the pointer "on" the button, so a cursor resting on its bottom edge
// doesn't flip hover on and off every frame.
const hoverCatch = "after:absolute after:inset-x-0 after:top-full after:h-1 after:content-['']";

const base =
  'relative inline-flex cursor-pointer items-center justify-center font-semibold whitespace-nowrap select-none transition-[box-shadow,background-color,border-color,color] duration-200 disabled:cursor-not-allowed disabled:opacity-50';

function variantClass(variant: Variant, accent: Accent): string {
  switch (variant) {
    case 'primary':
      return `${accentFill.violet} shadow-soft ${accentButtonGlow.violet}`;
    case 'accent':
      return `${accentFill[accent]} shadow-soft ${accentButtonGlow[accent]}`;
    case 'ghost':
      return 'border border-line bg-surface text-fg backdrop-blur-md hover:border-line-strong hover:bg-surface-strong';
  }
}

/** Springy button: squashes on press, lifts a touch on hover. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    accent = 'violet',
    icon,
    className = '',
    type = 'button',
    children,
    disabled,
    onHoverStart,
    onHoverEnd,
    ...rest
  },
  ref,
) {
  const reduced = useReducedMotion();
  const animated = !reduced && !disabled;
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled}
      whileHover={animated ? { y: -2 } : undefined}
      onHoverStart={(e, info) => {
        setHovered(true);
        onHoverStart?.(e, info);
      }}
      onHoverEnd={(e, info) => {
        setHovered(false);
        onHoverEnd?.(e, info);
      }}
      whileTap={animated ? { scale: 0.94, y: 0 } : undefined}
      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
      className={`${base} ${animated && hovered ? hoverCatch : ''} ${sizes[size]} ${variantClass(variant, accent)} ${className}`}
      {...rest}
    >
      {icon ? (
        <span className="-ml-0.5 inline-flex size-[1.15em] shrink-0" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
    </motion.button>
  );
});
