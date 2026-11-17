import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ToastProvider } from './Toast';
import { useToast, type ToastOptions } from './toast-context';

function Trigger(props: ToastOptions) {
  const { toast } = useToast();
  return (
    <button type="button" onClick={() => toast(props)}>
      Notify
    </button>
  );
}

function setup(props: ToastOptions) {
  return render(
    <ToastProvider>
      <Trigger {...props} />
    </ToastProvider>,
  );
}

describe('Toast', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('announces a status message', async () => {
    setup({ title: 'Saved', description: 'Your PDF is ready', tone: 'success' });
    await userEvent.click(screen.getByRole('button', { name: 'Notify' }));
    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('Saved');
    expect(status).toHaveTextContent('Your PDF is ready');
  });

  it('uses role="alert" for errors', async () => {
    setup({ title: 'That file is not a PDF', tone: 'error' });
    await userEvent.click(screen.getByRole('button', { name: 'Notify' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That file is not a PDF');
  });

  it('can be dismissed with its close button', async () => {
    setup({ title: 'Hello', duration: 0 });
    await userEvent.click(screen.getByRole('button', { name: 'Notify' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Dismiss notification' }));
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });

  it('hides itself after its duration', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    setup({ title: 'Brief', duration: 1000 });
    await userEvent.click(screen.getByRole('button', { name: 'Notify' }));
    expect(screen.getByRole('status')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });

  it('keeps at most three on screen', async () => {
    setup({ title: 'Again', duration: 0 });
    const button = screen.getByRole('button', { name: 'Notify' });
    for (let i = 0; i < 5; i++) await userEvent.click(button);
    await waitFor(() => expect(screen.getAllByRole('status')).toHaveLength(3));
  });

  it('throws a clear error outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Trigger title="x" />)).toThrow(/ToastProvider/);
    spy.mockRestore();
  });
});
