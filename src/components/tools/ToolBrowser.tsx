import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useDeferredValue, useMemo, useState } from 'react';
import { filterTools, type CategoryFilter as Category, type ToolInfo } from '../../tools';
import { Button } from '../ui';
import { CategoryFilter, type CategoryOption } from './CategoryFilter';
import { ToolGrid } from './ToolGrid';
import { ToolSearch } from './ToolSearch';

/** Tool grid with a category filter and a search box above it. */
export function ToolBrowser({ tools }: { tools: readonly ToolInfo[] }) {
  const reduced = useReducedMotion();
  const [category, setCategory] = useState<Category>('all');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const options = useMemo<CategoryOption[]>(
    () => [
      { value: 'all', label: 'All', count: tools.length },
      { value: 'pdf', label: 'PDF', count: filterTools(tools, 'pdf', '').length },
      { value: 'image', label: 'Image', count: filterTools(tools, 'image', '').length },
    ],
    [tools],
  );
  const shown = useMemo(
    () => filterTools(tools, category, deferredQuery),
    [tools, category, deferredQuery],
  );
  const filtered = category !== 'all' || deferredQuery.trim() !== '';

  const showAll = () => {
    setCategory('all');
    setQuery('');
  };

  return (
    <div>
      <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center sm:justify-between">
        <CategoryFilter
          options={options}
          value={category}
          onChange={setCategory}
          className="self-start"
        />
        <ToolSearch value={query} onChange={setQuery} className="sm:w-72" />
      </div>

      <p className="sr-only" aria-live="polite" data-testid="tool-count">
        {filtered ? `Showing ${shown.length} of ${tools.length} tools` : ''}
      </p>

      <ToolGrid tools={shown} featureEnds={!filtered} className="mt-5 sm:mt-6" />

      <AnimatePresence initial={false}>
        {shown.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: reduced ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="flex flex-col items-center rounded-panel border border-dashed border-line-strong px-6 py-12 text-center"
          >
            <svg viewBox="0 0 64 64" aria-hidden="true" className="size-16 text-muted">
              <path
                d="M16 8h22l12 12v34a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path
                d="M38 8v10a2 2 0 0 0 2 2h10M25 36h.01M39 36h.01M26 46c3.5-2.5 8.5-2.5 12 0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h3 className="mt-4 font-display text-xl font-bold tracking-tight text-balance">
              {deferredQuery.trim()
                ? `No tool called “${deferredQuery.trim()}” yet`
                : 'No tools here yet'}
            </h3>
            <p className="mt-1.5 max-w-sm text-muted">
              Try a shorter word like “pdf” or “photo”, or look through every tool.
            </p>
            <Button variant="ghost" className="mt-5" onClick={showAll}>
              Show all tools
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
