import { fireEvent, screen, within } from '@testing-library/react';
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
    const section = screen.getByRole('region', { name: /pick a tool/i });
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

describe('home hero', () => {
  it('lists the three privacy promises', () => {
    renderApp('/');
    const strip = screen.getByRole('list', { name: /how your files are handled/i });
    expect(
      within(strip)
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(['Works in this tab', 'No sign-up', 'Nothing kept']);
  });

  it('jumps to the tool list from the main button', async () => {
    renderApp('/');
    await userEvent.click(screen.getByRole('button', { name: /browse the tools/i }));
    expect(screen.getByRole('region', { name: /pick a tool/i })).toHaveFocus();
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

describe('pip lab route', () => {
  it('shows every pose and a wait screen that follows the slider', async () => {
    renderApp('/lab/pip');
    expect(await screen.findByRole('heading', { level: 1, name: 'Pip lab' })).toBeInTheDocument();
    for (const pose of ['sit', 'wave', 'puzzled']) {
      expect(screen.getByRole('img', { name: `Pip, ${pose} pose` })).toBeInTheDocument();
    }
    fireEvent.change(screen.getByRole('slider', { name: 'Progress' }), {
      target: { value: '0.9' },
    });
    expect(screen.getByRole('progressbar', { name: 'Merging 3 PDFs' })).toHaveAttribute(
      'aria-valuenow',
      '90',
    );
  });

  it('is not linked from the header', () => {
    renderApp('/');
    expect(screen.queryByRole('link', { name: /pip lab/i })).not.toBeInTheDocument();
  });
});
