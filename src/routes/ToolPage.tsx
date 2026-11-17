import { Link, useParams } from 'react-router-dom';
import { Badge } from '../components/ui';
import { accentText } from '../components/ui/accent';
import { getTool, type ToolInfo } from '../tools';
import { useDocumentTitle } from '../useDocumentTitle';
import NotFound from './NotFound';

export default function ToolPage() {
  const { id } = useParams();
  const tool = getTool(id);
  if (!tool) return <NotFound />;
  return <ToolPlaceholder tool={tool} />;
}

function ToolPlaceholder({ tool }: { tool: ToolInfo }) {
  useDocumentTitle(tool.name);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 pb-8 sm:px-8 sm:pt-20">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold text-muted transition-colors hover:text-fg"
      >
        <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
          <path
            d="M10 3 5 8l5 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        All tools
      </Link>
      <h1
        className={`mt-6 font-display text-5xl leading-none font-extrabold tracking-tight sm:text-7xl ${accentText[tool.accent]}`}
      >
        {tool.name}
      </h1>
      <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted sm:text-xl">{tool.blurb}</p>
      <Badge accent={tool.accent} dot className="mt-8 px-3.5 py-1 text-sm">
        Being built right now
      </Badge>
    </div>
  );
}
