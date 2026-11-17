import { useEffect, useRef } from 'react';

interface ToolSearchProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const isTyping = (el: Element | null) =>
  el instanceof HTMLInputElement ||
  el instanceof HTMLTextAreaElement ||
  el instanceof HTMLSelectElement ||
  (el instanceof HTMLElement && el.isContentEditable);

/** Search field for the tool grid. Press "/" anywhere to jump to it, Escape to clear. */
export function ToolSearch({ value, onChange, className = '' }: ToolSearchProps) {
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTyping(document.activeElement)) return;
      e.preventDefault();
      input.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const clear = () => {
    onChange('');
    input.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      <label htmlFor="tool-search" className="sr-only">
        Search tools
      </label>
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-4 z-10 size-5 -translate-y-1/2 text-muted"
      >
        <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <input
        ref={input}
        id="tool-search"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && value) {
            e.preventDefault();
            onChange('');
          }
        }}
        placeholder="Search tools"
        autoComplete="off"
        spellCheck={false}
        aria-keyshortcuts="/"
        className="h-12 w-full rounded-control border border-line bg-surface pr-12 pl-12 text-[0.95rem] shadow-soft backdrop-blur-xl transition-[border-color,box-shadow] duration-200 placeholder:text-muted hover:border-line-strong focus:border-violet focus-visible:rounded-control [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          className="absolute top-1/2 right-2 z-10 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-strong hover:text-fg"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
            <path
              d="M6 6l12 12M18 6 6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      ) : (
        <kbd
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 z-10 hidden -translate-y-1/2 rounded-md border border-line px-2 py-0.5 font-sans text-xs text-muted sm:block"
        >
          /
        </kbd>
      )}
    </div>
  );
}
