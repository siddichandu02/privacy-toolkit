import { LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { useId, useRef, type KeyboardEvent } from 'react';
import type { CategoryFilter as Category } from '../../tools';

export interface CategoryOption {
  value: Category;
  label: string;
  count: number;
}

interface CategoryFilterProps {
  options: readonly CategoryOption[];
  value: Category;
  onChange: (value: Category) => void;
  className?: string;
}

/**
 * Segmented control built as a radio group: one tab stop, arrow keys move the
 * choice, and a pill slides under the selected option.
 */
export function CategoryFilter({ options, value, onChange, className = '' }: CategoryFilterProps) {
  const reduced = useReducedMotion();
  const groupId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (e: KeyboardEvent, index: number) => {
    const last = options.length - 1;
    const next =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? index === last
          ? 0
          : index + 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? index === 0
            ? last
            : index - 1
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : null;
    const option = next === null ? undefined : options[next];
    if (next === null || !option) return;
    e.preventDefault();
    onChange(option.value);
    refs.current[next]?.focus();
  };

  return (
    <LayoutGroup id={groupId}>
      <div
        role="radiogroup"
        aria-label="Tool type"
        className={`inline-flex rounded-control border border-line bg-surface p-1 shadow-soft backdrop-blur-xl ${className}`}
      >
        {options.map((option, i) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(option.value)}
              onKeyDown={(e) => move(e, i)}
              className={`relative flex h-10 cursor-pointer items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors duration-200 focus-visible:rounded-xl pointer-coarse:h-11 ${selected ? 'text-on-violet' : 'text-muted hover:text-fg'}`}
            >
              {selected ? (
                <motion.span
                  layoutId="category-pill"
                  aria-hidden="true"
                  className="absolute inset-0 rounded-xl bg-violet-fill shadow-soft"
                  transition={
                    reduced ? { duration: 0 } : { type: 'spring', stiffness: 480, damping: 34 }
                  }
                />
              ) : null}
              <span className="relative">{option.label}</span>
              <span
                className={`relative min-w-5 rounded-md px-1 text-xs tabular-nums ${selected ? 'bg-white/20' : 'bg-surface-strong'}`}
                aria-label={`${option.count} tools`}
              >
                {option.count}
              </span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
