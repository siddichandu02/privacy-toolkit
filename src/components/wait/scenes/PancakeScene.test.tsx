import { render, screen } from '@testing-library/react';
import { MotionConfig } from 'framer-motion';
import { describe, expect, it } from 'vitest';
import { PancakeScene } from './PancakeScene';

describe('PancakeScene', () => {
  it('grows the stack with progress', () => {
    const { rerender } = render(<PancakeScene progress={0} />);
    expect(screen.getByTestId('pancake-scene')).toHaveAttribute('data-landed', '1');
    rerender(<PancakeScene progress={0.5} />);
    expect(screen.getByTestId('pancake-scene')).toHaveAttribute('data-landed', '3');
    rerender(<PancakeScene progress={1} layers={8} />);
    expect(screen.getByTestId('pancake-scene')).toHaveAttribute('data-landed', '8');
  });

  it('has Pip holding the pan', () => {
    const { container } = render(<PancakeScene progress={0.2} />);
    expect(container.querySelector('[data-pose="hold"]')).not.toBeNull();
  });

  it('flips a page while working and stops when done', () => {
    const { container, rerender } = render(<PancakeScene progress={0.4} />);
    expect(container.querySelector('[data-part="flying-page"]')).not.toBeNull();
    rerender(<PancakeScene progress={1} />);
    expect(container.querySelector('[data-part="flying-page"]')).toBeNull();
  });

  it('keeps still with reduced motion', () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <PancakeScene progress={0.4} />
      </MotionConfig>,
    );
    expect(container.querySelector('[data-part="flying-page"]')).toBeNull();
  });
});
