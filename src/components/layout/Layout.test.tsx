import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../../test/renderApp';

describe('app shell', () => {
  it('has a header with a home link, nav and theme toggle', () => {
    renderApp('/tools/merge');
    const header = screen.getByRole('banner');
    expect(within(header).getByRole('link', { name: /privacy toolkit, home/i })).toHaveAttribute(
      'href',
      '/',
    );
    expect(within(header).getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    expect(within(header).getByRole('button', { name: /switch to/i })).toBeInTheDocument();
  });

  it('opens the source link in a new tab', () => {
    renderApp('/');
    const link = screen.getByRole('link', { name: /source code on github/i });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
  });

  it('shows the privacy promise in the footer', () => {
    renderApp('/');
    const footer = screen.getByRole('contentinfo');
    const promise = within(footer).getByRole('list', { name: /our promise/i });
    expect(
      within(promise)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['No uploads', 'No tracking', 'No accounts']);
  });

  it('skip link is the first tab stop and moves focus to main', async () => {
    const user = userEvent.setup();
    renderApp('/');
    await user.tab();
    const skip = screen.getByRole('link', { name: /skip to content/i });
    expect(skip).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('main')).toHaveFocus();
  });
});
