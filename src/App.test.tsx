import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from './test/renderApp';
import { TOOLS } from './tools';

describe('home route', () => {
  it('states the privacy promise in the main heading', () => {
    renderApp('/');
    expect(
      screen.getByRole('heading', { level: 1, name: /your files stay on your device/i }),
    ).toBeInTheDocument();
  });

  it('links to every planned tool', () => {
    renderApp('/');
    const section = screen.getByRole('region', { name: /tools on the way/i });
    expect(within(section).getAllByRole('link')).toHaveLength(TOOLS.length);
    expect(within(section).getByRole('link', { name: 'Merge PDF' })).toHaveAttribute(
      'href',
      '/tools/merge',
    );
  });

  it('explains how to verify nothing is uploaded', async () => {
    renderApp('/');
    await userEvent.click(screen.getByRole('button', { name: /how can i check that/i }));
    expect(await screen.findByRole('status')).toHaveTextContent(/zero uploads/i);
  });
});

describe('tool routes', () => {
  it.each(TOOLS.map((t) => [t.id, t.name]))('renders /tools/%s', async (id, name) => {
    renderApp(`/tools/${id}`);
    expect(await screen.findByRole('heading', { level: 1, name })).toBeInTheDocument();
    expect(document.title).toBe(`${name} | Privacy Toolkit`);
  });

  it('shows the not found page for an unknown tool', async () => {
    renderApp('/tools/teleport');
    expect(
      await screen.findByRole('heading', { level: 1, name: /folded itself away/i }),
    ).toBeInTheDocument();
  });
});

describe('not found route', () => {
  it('offers a way back home', async () => {
    renderApp('/this/does/not/exist');
    expect(await screen.findByRole('link', { name: /back to all tools/i })).toHaveAttribute(
      'href',
      '/',
    );
  });
});
