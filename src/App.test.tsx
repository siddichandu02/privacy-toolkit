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
    const section = screen.getByRole('region', { name: /all tools/i });
    expect(within(section).getAllByRole('link')).toHaveLength(TOOLS.length);
    expect(within(section).getByRole('link', { name: 'Merge PDF' })).toHaveAttribute(
      'href',
      '/tools/merge',
    );
  });

  it('counts the tools and points back to the drop area', async () => {
    renderApp('/');
    expect(screen.getByTestId('tools-count')).toHaveTextContent(String(TOOLS.length));
    const tip = screen.getByRole('button', { name: /a file at the top/i });
    Element.prototype.scrollIntoView ??= () => {};
    await userEvent.click(tip);
    expect(document.activeElement).toHaveAccessibleName(/file to start/i);
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
    // The tool's own code loads lazily, which can be slow on a busy machine.
    expect(await screen.findByText('1 PDF', {}, { timeout: 5000 })).toBeInTheDocument();
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
    expect(document.title).toBe(`${name} | PDFPip`);
  });

  it('shows the not found page for an unknown tool', async () => {
    renderApp('/tools/teleport');
    expect(
      await screen.findByRole('heading', { level: 1, name: /folded itself away/i }),
    ).toBeInTheDocument();
  });
});

describe('not found route', () => {
  it('suggests the tool a mistyped link was reaching for', async () => {
    renderApp('/tools/merg');
    const near = await screen.findByRole('navigation', { name: 'Did you mean' });
    expect(within(near).getByRole('link', { name: 'Merge PDF' })).toHaveAttribute(
      'href',
      '/tools/merge',
    );
  });

  it('suggests nothing when no tool is close', async () => {
    renderApp('/tools/teleport');
    await screen.findByRole('heading', { level: 1, name: /folded itself away/i });
    expect(screen.queryByRole('navigation', { name: 'Did you mean' })).not.toBeInTheDocument();
  });

  it('unfolds the crumpled page and folds it back', async () => {
    renderApp('/nowhere');
    const ball = await screen.findByRole('button', { name: 'Unfold the crumpled page' });
    fireEvent.click(ball);
    expect(ball).toHaveAttribute('aria-pressed', 'true');
    expect(ball).toHaveAccessibleName('Crumple the page back up');
    expect(screen.getByText('Found the way back.')).toBeInTheDocument();
    fireEvent.click(ball);
    expect(ball).toHaveAttribute('aria-pressed', 'false');
  });

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
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Pip lab' }, { timeout: 5000 }),
    ).toBeInTheDocument();
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
