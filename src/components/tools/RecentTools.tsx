import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { prefetchTool } from '../../routes/toolLoaders';
import { getTool, toolPath, type ToolInfo } from '../../tools';
import { useStillMotion } from '../../useStillMotion';
import { clearRecentTools, useRecentTools } from '../palette/recent';
import { accentSoft } from '../ui/accent';
import { ToolIcon } from './ToolIcon';

/** A short row of the tools opened lately, so a return visit is one click. */
export function RecentTools({ className = '' }: { className?: string }) {
  const ids = useRecentTools();
  const still = useStillMotion();
  const tools = ids.map((id) => getTool(id)).filter((t): t is ToolInfo => !!t);

  return (
    <AnimatePresence initial={false}>
      {tools.length > 0 ? (
        <motion.nav
          key="recent"
          aria-label="Opened lately"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={still ? { duration: 0.15 } : { type: 'spring', stiffness: 380, damping: 34 }}
          className={`overflow-hidden ${className}`}
        >
          <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
            <div className="flex w-full items-center justify-between sm:contents">
              <span className="mr-1 text-sm font-semibold text-muted">Opened lately</span>
              <ClearButton />
            </div>
            <ul className="contents">
              {tools.map((tool) => (
                <li key={tool.id}>
                  <Link
                    to={toolPath(tool.id)}
                    onPointerEnter={() => prefetchTool(tool.id)}
                    onFocus={() => prefetchTool(tool.id)}
                    className={`flex h-9 items-center gap-2 rounded-full border pr-3.5 pl-1.5 text-sm font-semibold transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ${accentSoft[tool.accent]}`}
                  >
                    <span className="grid size-6 place-items-center rounded-full bg-canvas-raised/70">
                      <ToolIcon id={tool.id} className="size-4" />
                    </span>
                    <span className="text-fg">{tool.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </motion.nav>
      ) : null}
    </AnimatePresence>
  );
}

function ClearButton() {
  return (
    <button
      type="button"
      onClick={clearRecentTools}
      aria-label="Clear the tools opened lately"
      className="h-9 cursor-pointer rounded-full px-3 text-sm text-muted underline-offset-4 transition-colors hover:text-fg hover:underline sm:order-last sm:ml-1"
    >
      Clear
    </button>
  );
}
