import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders its label with a neutral tone by default', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New')).toHaveClass('text-muted');
  });

  it('uses the accent tone and a decorative dot', () => {
    render(
      <Badge accent="sky" dot>
        Offline ready
      </Badge>,
    );
    const badge = screen.getByText('Offline ready');
    expect(badge).toHaveClass('text-sky');
    expect(badge.querySelector('[aria-hidden="true"]')).toHaveClass('bg-sky');
  });
});
