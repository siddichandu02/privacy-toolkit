import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ToolInfo } from '../../tools';
import { ToolCard } from './ToolCard';

const merge: ToolInfo = {
  id: 'merge',
  name: 'Merge PDF',
  category: 'pdf',
  accent: 'violet',
  blurb: 'Combine several PDFs into one file.',
  input: { kind: 'pdf', multiple: true, ordered: true },
};

function renderCard() {
  return render(
    <MemoryRouter>
      <ToolCard tool={merge} />
    </MemoryRouter>,
  );
}

describe('ToolCard', () => {
  it('is one link to the tool, named by its heading', () => {
    renderCard();
    const link = screen.getByRole('link', { name: /merge pdf/i });
    expect(link).toHaveAttribute('href', '/tools/merge');
    expect(screen.getByRole('heading', { level: 3, name: 'Merge PDF' })).toBeInTheDocument();
  });

  it('shows the blurb and category', () => {
    renderCard();
    expect(screen.getByRole('link', { name: 'Merge PDF' })).toHaveAccessibleDescription(
      merge.blurb,
    );
    expect(screen.getByText('PDF')).toBeInTheDocument();
  });

  it('uses the tool accent for its glow', () => {
    renderCard();
    expect(screen.getByRole('link').className).toContain('hover:shadow-glow-violet');
  });

  it('copes with pointer movement', () => {
    renderCard();
    const link = screen.getByRole('link');
    fireEvent.pointerMove(link, { clientX: 10, clientY: 10, pointerType: 'mouse' });
    fireEvent.pointerLeave(link);
    expect(link).toBeInTheDocument();
  });
});

describe('ToolCard keyboard', () => {
  it('is a single tab stop', async () => {
    const user = userEvent.setup();
    renderCard();
    await user.tab();
    expect(screen.getByRole('link')).toHaveFocus();
    await user.tab();
    expect(document.body).toHaveFocus();
  });
});
