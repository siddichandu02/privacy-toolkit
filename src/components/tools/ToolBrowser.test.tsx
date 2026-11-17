import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { TOOLS } from '../../tools';
import { ToolBrowser } from './ToolBrowser';

function renderBrowser() {
  render(
    <MemoryRouter>
      <ToolBrowser tools={TOOLS} />
    </MemoryRouter>,
  );
  return userEvent.setup();
}

const cardNames = () =>
  within(screen.getByRole('list'))
    .queryAllByRole('link')
    .map((l) => l.getAttribute('href'));

describe('ToolBrowser', () => {
  it('shows every tool to start with', () => {
    renderBrowser();
    expect(cardNames()).toHaveLength(TOOLS.length);
  });

  it('filters by category', async () => {
    const user = renderBrowser();
    await user.click(screen.getByRole('radio', { name: /image/i }));
    const imageCount = TOOLS.filter((t) => t.category === 'image').length;
    // Removed cards play a short exit animation before leaving the DOM.
    await waitFor(() => expect(cardNames()).toHaveLength(imageCount));
    expect(screen.getByTestId('tool-count')).toHaveTextContent(
      `Showing ${imageCount} of ${TOOLS.length} tools`,
    );
  });

  it('filters by search text', async () => {
    const user = renderBrowser();
    await user.type(screen.getByRole('searchbox', { name: /search tools/i }), 'heic');
    await waitFor(() => expect(cardNames()).toEqual(['/tools/convert']));
  });

  it('shows an empty state that resets everything', async () => {
    const user = renderBrowser();
    await user.click(screen.getByRole('radio', { name: /pdf/i }));
    await user.type(screen.getByRole('searchbox'), 'teleport');
    expect(
      screen.getByRole('heading', { name: /no tool called “teleport” yet/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /show all tools/i }));
    expect(screen.getByRole('searchbox')).toHaveValue('');
    expect(screen.getByRole('radio', { name: /all/i })).toBeChecked();
    await waitFor(() => expect(cardNames()).toHaveLength(TOOLS.length));
  });

  it('clears the search with Escape or the clear button', async () => {
    const user = renderBrowser();
    const box = screen.getByRole('searchbox');
    await user.type(box, 'merge{Escape}');
    expect(box).toHaveValue('');
    await user.type(box, 'sign');
    await user.click(screen.getByRole('button', { name: /clear search/i }));
    expect(box).toHaveValue('');
    expect(box).toHaveFocus();
  });

  it('jumps to the search box when "/" is pressed', async () => {
    const user = renderBrowser();
    await user.keyboard('/');
    expect(screen.getByRole('searchbox')).toHaveFocus();
    expect(screen.getByRole('searchbox')).toHaveValue('');
  });
});
