import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../../test/renderApp';
import { rememberTool, resetRecentCache } from './recent';
import { closeOverlay } from './store';

beforeEach(() => {
  localStorage.clear();
  resetRecentCache();
  act(() => closeOverlay());
});

const palette = () => screen.getByRole('dialog', { name: /search tools and actions/i });
const options = () => within(palette()).getAllByRole('option');
const selected = () => options().find((o) => o.getAttribute('aria-selected') === 'true');

describe('command palette', () => {
  it('opens with Ctrl+K, lists every tool and closes with Escape', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await user.keyboard('{Control>}k{/Control}');
    const input = within(palette()).getByRole('combobox');
    expect(input).toHaveFocus();
    expect(options().filter((o) => o.dataset.group === 'Tools')).toHaveLength(10);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('opens from the header button and hands focus back on close', async () => {
    const user = userEvent.setup();
    renderApp('/');
    const button = screen.getByRole('button', { name: 'Search tools' });
    await user.click(button);
    expect(palette()).toBeInTheDocument();
    await user.keyboard('{Control>}k{/Control}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(button).toHaveFocus();
  });

  it('ranks matches, moves with arrows and opens the tool on Enter', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await user.keyboard('{Control>}k{/Control}');
    await user.keyboard('passport');
    expect(options()).toHaveLength(1);
    expect(selected()).toHaveTextContent('Resize and crop');
    await user.clear(within(palette()).getByRole('combobox'));
    await user.keyboard('compress');
    expect(selected()).toHaveTextContent('Compress PDF');
    await user.keyboard('{ArrowDown}');
    expect(selected()).toHaveTextContent('Compress image');
    const input = within(palette()).getByRole('combobox');
    expect(input).toHaveAttribute('aria-activedescendant', selected()?.id);
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('heading', { level: 1, name: 'Compress image' })).toBeVisible();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('wraps around at both ends', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await user.keyboard('{Control>}k{/Control}');
    await user.keyboard('{ArrowUp}');
    expect(selected()).toHaveTextContent('Go to all tools');
    await user.keyboard('{ArrowDown}');
    expect(selected()).toHaveTextContent('Merge PDF');
  });

  it('shows recent tools first', async () => {
    rememberTool('exif');
    rememberTool('sign');
    const user = userEvent.setup();
    renderApp('/');
    await user.keyboard('{Control>}k{/Control}');
    const recent = options().filter((o) => o.dataset.group === 'Recent');
    expect(recent.map((o) => o.textContent)).toEqual([
      expect.stringContaining('Sign PDF'),
      expect.stringContaining('Remove EXIF'),
    ]);
    expect(within(palette()).getByText('Opened lately')).toBeInTheDocument();
    expect(options().filter((o) => o.dataset.group === 'Tools')).toHaveLength(8);
  });

  it('remembers tools you open', async () => {
    const user = userEvent.setup();
    renderApp('/tools/split');
    await user.keyboard('{Control>}k{/Control}');
    expect(options()[0]).toHaveTextContent('Split PDF');
    expect(options()[0]).toHaveAttribute('data-group', 'Recent');
  });

  it('switches the theme from an action', async () => {
    const user = userEvent.setup();
    renderApp('/');
    const before = document.documentElement.dataset.theme;
    await user.keyboard('{Control>}k{/Control}');
    await user.keyboard('theme{Enter}');
    expect(document.documentElement.dataset.theme).not.toBe(before);
  });

  it('says so when nothing matches', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await user.keyboard('{Control>}k{/Control}');
    await user.keyboard('teleport');
    expect(within(palette()).queryAllByRole('option')).toHaveLength(0);
    expect(within(palette()).getByText(/nothing called “teleport” yet/i)).toBeInTheDocument();
  });

  it('opens a tool with a click', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await user.click(screen.getByRole('button', { name: 'Search tools' }));
    await user.click(within(palette()).getByRole('option', { name: /merge pdf/i }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Merge PDF' })).toBeVisible();
  });
});

describe('shortcuts sheet', () => {
  it('opens with ? and lists the keys', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await user.keyboard('?');
    const sheet = screen.getByRole('dialog', { name: 'Keyboard shortcuts' });
    expect(within(sheet).getByText('Search tools and actions')).toBeInTheDocument();
    expect(within(sheet).getByText('Turn right')).toBeInTheDocument();
    await user.click(within(sheet).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('does not open while typing in a field', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await user.click(screen.getByRole('searchbox', { name: /search tools/i }));
    await user.keyboard('?');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens from the palette and hands focus back to the opener', async () => {
    const user = userEvent.setup();
    renderApp('/');
    const button = screen.getByRole('button', { name: 'Search tools' });
    await user.click(button);
    await user.keyboard('shortcuts{Enter}');
    expect(await screen.findByRole('dialog', { name: 'Keyboard shortcuts' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(button).toHaveFocus();
  });

  it('keeps Tab inside the sheet', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await user.keyboard('?');
    const close = within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' });
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
  });
});
