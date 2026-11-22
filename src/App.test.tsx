import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from './test/renderApp';
import { TOOLS } from './tools';

describe('home route', () => {
  it('says what the site does in the main heading', () => {
    renderApp('/');
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /every pdf and image tool you need, right in your browser/i,
      }),
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

  it('opens a live check that nothing is sent', async () => {
    renderApp('/');
    const toggle = screen.getByRole('button', { name: /how can i check/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const proof = await screen.findByRole('region', { name: 'Privacy check' });
    expect(within(proof).getByTestId('bytes-sent')).toHaveTextContent('0');
    expect(proof).toHaveTextContent(/sent to other sites/);
    await userEvent.click(screen.getByRole('button', { name: /hide the check/i }));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Privacy check' })).toBeNull());
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

  it('suggests tools for a picked file and opens one with it', async () => {
    renderApp('/');
    const file = new File(['%PDF-1.4'], 'report.pdf', { type: 'application/pdf' });
    await userEvent.upload(screen.getByTestId('hero-file-input'), file);
    const group = screen.getByRole('group', { name: /what should we do with it/i });
    expect(within(group).getByText(/report\.pdf/)).toBeInTheDocument();
    await userEvent.click(within(group).getByRole('button', { name: /split pdf/i }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Split PDF' })).toBeInTheDocument();
    expect(await screen.findByText('1 PDF')).toBeInTheDocument();
  });

  it('says when a file type cannot be opened', async () => {
    renderApp('/');
    const file = new File(['x'], 'notes.docx');
    await userEvent.upload(screen.getByTestId('hero-file-input'), file, { applyAccept: false });
    expect(screen.getByRole('alert')).toHaveTextContent(/docx files can't be opened yet/i);
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
