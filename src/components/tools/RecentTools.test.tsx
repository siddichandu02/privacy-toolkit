import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { rememberTool, resetRecentCache } from '../palette/recent';
import { RecentTools } from './RecentTools';

beforeEach(() => {
  localStorage.clear();
  resetRecentCache();
});

const renderRow = () =>
  render(
    <MemoryRouter>
      <RecentTools />
    </MemoryRouter>,
  );

describe('RecentTools', () => {
  it('shows nothing before any tool was opened', () => {
    renderRow();
    expect(screen.queryByRole('navigation', { name: 'Opened lately' })).not.toBeInTheDocument();
  });

  it('links the tools opened lately, newest first', () => {
    rememberTool('merge');
    rememberTool('exif');
    renderRow();
    const nav = screen.getByRole('navigation', { name: 'Opened lately' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual(['Remove EXIF', 'Merge PDF']);
    expect(links[0]).toHaveAttribute('href', '/tools/exif');
  });

  it('appears when a tool is opened and clears on request', async () => {
    const user = userEvent.setup();
    renderRow();
    act(() => rememberTool('sign'));
    const nav = screen.getByRole('navigation', { name: 'Opened lately' });
    await user.click(within(nav).getByRole('button', { name: /clear the tools opened lately/i }));
    await waitFor(() =>
      expect(screen.queryByRole('navigation', { name: 'Opened lately' })).not.toBeInTheDocument(),
    );
    expect(localStorage.getItem('ptk:recent-tools')).toBeNull();
  });
});
