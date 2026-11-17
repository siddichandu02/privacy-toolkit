import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { ToastProvider } from './components/ui';
import { TOOLS } from './tools';

describe('App placeholder landing', () => {
  it('states the privacy promise in the main heading', () => {
    render(
      <ToastProvider>
        <App />
      </ToastProvider>,
    );
    expect(
      screen.getByRole('heading', { level: 1, name: /your files stay on your device/i }),
    ).toBeInTheDocument();
  });

  it('lists every planned tool', () => {
    render(
      <ToastProvider>
        <App />
      </ToastProvider>,
    );
    const section = screen.getByRole('region', { name: /tools on the way/i });
    const list = within(section).getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(TOOLS.length);
    expect(within(list).getByText('Merge PDF')).toBeInTheDocument();
  });

  it('explains how to verify nothing is uploaded', async () => {
    render(
      <ToastProvider>
        <App />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: /how can i check that/i }));
    expect(await screen.findByRole('status')).toHaveTextContent(/zero uploads/i);
  });
});
