import type { ToolInfo } from '../../tools';
import { ToolCard } from './ToolCard';

interface ToolGridProps {
  tools: readonly ToolInfo[];
  className?: string;
  /**
   * Give the first and last tools wide cards on large screens. With ten tools
   * in three columns that closes the grid into four full rows.
   */
  featureEnds?: boolean;
}

/** Responsive grid of tool cards: one column on phones, up to three on desktop. */
export function ToolGrid({ tools, className = '', featureEnds = false }: ToolGridProps) {
  return (
    <ul className={`grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 ${className}`}>
      {tools.map((tool, i) => {
        const featured = featureEnds && (i === 0 || i === tools.length - 1);
        return (
          <li key={tool.id} className={featured ? 'lg:col-span-2' : undefined}>
            <ToolCard tool={tool} featured={featured} />
          </li>
        );
      })}
    </ul>
  );
}
