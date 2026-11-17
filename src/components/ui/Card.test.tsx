import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('renders children and passes through attributes', () => {
    render(
      <Card aria-label="Merge PDF" role="region">
        Combine files
      </Card>,
    );
    const card = screen.getByRole('region', { name: 'Merge PDF' });
    expect(card).toHaveTextContent('Combine files');
  });

  it('adds the accent glow only when an accent is set', () => {
    const { rerender } = render(<Card data-testid="card" />);
    expect(screen.getByTestId('card').className).not.toMatch(/shadow-glow/);
    rerender(<Card data-testid="card" accent="coral" />);
    expect(screen.getByTestId('card')).toHaveClass('hover:shadow-glow-coral');
  });

  it('uses the larger shape for panels', () => {
    render(<Card data-testid="card" size="panel" />);
    expect(screen.getByTestId('card')).toHaveClass('rounded-panel');
  });
});
