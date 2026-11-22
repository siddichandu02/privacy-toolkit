import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { getTool, type ToolInfo } from '../tools';
import { prefetchTool } from './toolLoaders';
import { PanelBoundary, PanelPlaceholder, ToolPanel } from './toolPanels';

vi.mock('../workers/appVersion', () => ({ hasNewerVersion: vi.fn(async () => false) }));

const merge = getTool('merge') as ToolInfo;

function Boom(): never {
  throw new Error('chunk failed');
}

describe('ToolPanel', () => {
  it('loads the tool on demand', async () => {
    render(<ToolPanel tool={merge} />);
    expect(await screen.findByRole('region', { name: 'Your files' })).toBeInTheDocument();
  });

  it('names the tool while it loads', () => {
    render(<PanelPlaceholder tool={merge} />);
    expect(screen.getByRole('status')).toHaveTextContent('Getting Merge PDF ready');
  });

  it('prefetching an unknown tool is harmless', () => {
    expect(() => prefetchTool('nope')).not.toThrow();
  });
});

describe('PanelBoundary', () => {
  it('offers a retry when a tool fails to load, and the retry works', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    function Harness() {
      const [ok, setOk] = useState(false);
      const [attempt, setAttempt] = useState(0);
      return (
        <PanelBoundary
          key={attempt}
          onRetry={() => {
            setOk(true);
            setAttempt((n) => n + 1);
          }}
        >
          {ok ? <p>Loaded</p> : <Boom />}
        </PanelBoundary>
      );
    }
    render(<Harness />);
    expect(screen.getByRole('alert')).toHaveTextContent('This tool did not load');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('Loaded')).toBeInTheDocument();
    vi.mocked(console.error).mockRestore();
  });

  it('asks for a reload when a newer version is out', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { hasNewerVersion } = await import('../workers/appVersion');
    vi.mocked(hasNewerVersion).mockResolvedValueOnce(true);
    render(
      <PanelBoundary onRetry={vi.fn()}>
        <Boom />
      </PanelBoundary>,
    );
    expect(
      await screen.findByRole('heading', { name: 'A newer version is ready' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();
    vi.mocked(console.error).mockRestore();
  });
});
