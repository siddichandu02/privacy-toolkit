import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ErrorCard } from './ErrorCard';

const buttons = () => screen.getAllByRole('button').map((b) => b.textContent);

describe('ErrorCard', () => {
  it('announces the problem and focuses the heading', async () => {
    render(
      <ErrorCard
        title="The merge did not finish"
        message="Out of memory."
        onRetry={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Out of memory.');
    const heading = screen.getByRole('heading', { name: 'The merge did not finish' });
    await waitFor(() => expect(heading).toHaveFocus());
  });

  it('leads with trying again when no file is to blame', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(<ErrorCard title="Failed" message="Oops." onRetry={onRetry} onBack={vi.fn()} />);
    expect(buttons()).toEqual(['Try again', 'Back to your files']);
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('leads with going back when one file is broken', async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    render(
      <ErrorCard
        title="Failed"
        message="b.pdf could not be read."
        fileName="b.pdf"
        onRetry={vi.fn()}
        onBack={onBack}
        backLabel="Pick other files"
      />,
    );
    expect(buttons()).toEqual(['Pick other files', 'Try again']);
    await user.click(screen.getByRole('button', { name: 'Pick other files' }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});

describe('ErrorCard after an update', () => {
  it('offers a reload instead of a retry that would fail again', async () => {
    const onReload = vi.fn();
    const user = userEvent.setup();
    render(
      <ErrorCard
        title="The merge did not finish"
        message="Privacy Toolkit was updated while this page was open."
        reason="updated"
        fileName="a.pdf"
        onRetry={vi.fn()}
        onBack={vi.fn()}
        onReload={onReload}
      />,
    );
    expect(screen.getByRole('heading', { name: 'A newer version is ready' })).toBeInTheDocument();
    expect(buttons()).toEqual(['Reload page', 'Back to your files']);
    await user.click(screen.getByRole('button', { name: 'Reload page' }));
    expect(onReload).toHaveBeenCalledOnce();
  });
});
