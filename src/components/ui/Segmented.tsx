import { motion } from 'framer-motion';
import { useId, type CSSProperties, type ReactNode } from 'react';
import { useStillMotion } from '../../useStillMotion';
import type { Accent } from './accent';

export interface SegmentOption<T extends string> {
  id: T;
  label: string;
  icon?: ReactNode;
}

export interface SegmentedProps<T extends string> {
  /** Shown above the control. Also its accessible name. */
  legend: string;
  /** Hide the legend visually but keep it for screen readers. */
  hideLegend?: boolean;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accent: Accent;
  disabled?: boolean;
  /** A short line under the control, e.g. why it is disabled. */
  hint?: string;
  className?: string;
}

/**
 * A row of radio buttons drawn as one pill track, with a raised chip that
 * springs to the picked option. Arrow keys move between options as usual.
 */
export function Segmented<T extends string>({
  legend,
  hideLegend,
  options,
  value,
  onChange,
  accent,
  disabled,
  hint,
  className = '',
}: SegmentedProps<T>) {
  const still = useStillMotion();
  const name = useId();
  const hintId = useId();
  return (
    <fieldset
      disabled={disabled}
      aria-describedby={hint ? hintId : undefined}
      className={`min-w-0 ${className}`}
    >
      <legend className={hideLegend ? 'sr-only' : 'mb-2 text-sm font-semibold text-muted'}>
        {legend}
      </legend>
      <div
        className="relative grid rounded-2xl border border-line bg-canvas/60 p-1 transition-opacity"
        style={{
          gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
          opacity: disabled ? 0.45 : 1,
        }}
      >
        {options.map((o) => {
          const on = o.id === value;
          return (
            <label
              key={o.id}
              className={`relative rounded-xl px-2 py-2.5 text-sm font-semibold whitespace-nowrap transition-[color,scale] duration-150 active:scale-[0.97] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--pick)] motion-reduce:active:scale-100 sm:px-3 pointer-coarse:py-3 ${
                disabled ? 'cursor-not-allowed' : 'cursor-pointer'
              } ${on ? 'text-fg' : 'text-muted hover:text-fg'}`}
              style={{ '--pick': `var(--${accent})` } as CSSProperties}
            >
              {on ? (
                <motion.span
                  layoutId={still ? undefined : `${name}-chip`}
                  className="absolute inset-0 rounded-xl border border-line-strong bg-surface shadow-soft"
                  transition={{ type: 'spring', stiffness: 520, damping: 30, mass: 0.8 }}
                />
              ) : null}
              <input
                type="radio"
                name={name}
                value={o.id}
                checked={on}
                onChange={() => onChange(o.id)}
                className="sr-only"
              />
              {/* The picked option gives a small springy hop as the chip arrives. */}
              <motion.span
                className="relative flex items-center justify-center gap-1.5"
                initial={false}
                animate={
                  on && !still ? { scale: [0.9, 1.07, 1], y: [1, -1.5, 0] } : { scale: 1, y: 0 }
                }
                transition={{ duration: 0.34, ease: 'easeOut' }}
              >
                {o.icon ? (
                  <motion.span
                    className="flex"
                    initial={false}
                    animate={on && !still ? { rotate: [0, -14, 10, 0] } : { rotate: 0 }}
                    transition={{ duration: 0.42, ease: 'easeOut' }}
                  >
                    {o.icon}
                  </motion.span>
                ) : null}
                {o.label}
              </motion.span>
            </label>
          );
        })}
      </div>
      {hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </fieldset>
  );
}
