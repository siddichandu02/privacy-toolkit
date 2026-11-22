import { Component, lazy, Suspense, useState, type ReactNode } from 'react';
import { ErrorCard } from '../components/result/ErrorCard';
import { accentText } from '../components/ui/accent';
import type { ToolInfo } from '../tools';
import { loaderFor } from './toolLoaders';
import { hasNewerVersion } from '../workers/appVersion';
import type { FailReason } from '../workers/useWorkerJob';

function makePanel(id: string) {
  return lazy(() => loaderFor(id)().then((p) => ({ default: p })));
}

/** The tool's own controls, loaded on demand. */
export function ToolPanel({ tool }: { tool: ToolInfo }) {
  // Bumped on retry so a failed load gets a fresh attempt.
  const [attempt, setAttempt] = useState(0);
  const [Panel, setPanel] = useState(() => makePanel(tool.id));
  return (
    <PanelBoundary
      key={attempt}
      onRetry={() => {
        // lazy() remembers a failed load, so start over with a new one.
        setPanel(makePanel(tool.id));
        setAttempt((n) => n + 1);
      }}
    >
      <Suspense fallback={<PanelPlaceholder tool={tool} />}>
        <Panel tool={tool} />
      </Suspense>
    </PanelBoundary>
  );
}

/**
 * Shown while the tool loads. It waits a moment before it appears, so a quick
 * load (the usual case) never flashes it.
 */
export function PanelPlaceholder({ tool }: { tool: ToolInfo }) {
  return (
    <div
      role="status"
      className="panel-wait mt-12 flex min-h-64 flex-col items-center justify-center gap-4 rounded-panel border-2 border-dashed border-line bg-surface/50 px-6 py-12 backdrop-blur-xl sm:mt-16"
    >
      <span aria-hidden="true" className="panel-wait-sheets">
        <span />
        <span />
        <span className={accentText[tool.accent]} />
      </span>
      <span className="text-sm font-semibold text-muted">Getting {tool.name} ready</span>
    </div>
  );
}

interface BoundaryProps {
  children: ReactNode;
  onRetry: () => void;
}

interface BoundaryState {
  failed: boolean;
  reason?: FailReason;
}

/** Catches a tool that failed to load and offers a retry, or a reload after a new release. */
export class PanelBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch() {
    void hasNewerVersion().then((newer) => {
      if (newer) this.setState({ reason: 'updated' });
    });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const updated = this.state.reason === 'updated';
    return (
      <div className="mt-12 sm:mt-16">
        <ErrorCard
          title={updated ? 'A newer version is ready' : 'This tool did not load'}
          message={
            updated
              ? 'The site was updated while this tab was open. Reload to get the new version.'
              : 'Part of the page could not be fetched. Check your connection and try again.'
          }
          reason={this.state.reason}
          onRetry={this.props.onRetry}
          onBack={() => window.location.assign(import.meta.env.BASE_URL)}
          backLabel="All tools"
        />
      </div>
    );
  }
}
