import { useMemo, useState } from 'react';
import { filterTools, type CategoryFilter as Category, type ToolInfo } from '../../tools';
import { CategoryFilter, type CategoryOption } from './CategoryFilter';
import { ToolGrid } from './ToolGrid';

/** Tool grid with a category filter above it. */
export function ToolBrowser({ tools }: { tools: readonly ToolInfo[] }) {
  const [category, setCategory] = useState<Category>('all');

  const options = useMemo<CategoryOption[]>(
    () => [
      { value: 'all', label: 'All', count: tools.length },
      { value: 'pdf', label: 'PDF', count: filterTools(tools, 'pdf', '').length },
      { value: 'image', label: 'Image', count: filterTools(tools, 'image', '').length },
    ],
    [tools],
  );
  const shown = filterTools(tools, category, '');

  return (
    <div>
      <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-8">
        <CategoryFilter options={options} value={category} onChange={setCategory} />
      </div>
      <ToolGrid tools={shown} featureEnds={category === 'all'} className="mt-5 sm:mt-6" />
    </div>
  );
}
