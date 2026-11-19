import { render, screen } from '@testing-library/react';
import { MotionConfig } from 'framer-motion';
import { describe, expect, it } from 'vitest';
import { PizzaScene } from './PizzaScene';

const count = (c: HTMLElement, part: string) => c.querySelectorAll(`[data-part="${part}"]`).length;

describe('PizzaScene', () => {
  it('lands turned pages on the counter as progress grows', () => {
    const { container, rerender } = render(<PizzaScene progress={0} />);
    const scene = screen.getByTestId('pizza-scene');
    expect(scene).toHaveAttribute('data-landed', '0');
    expect(count(container, 'page-spinning')).toBe(1);

    rerender(<PizzaScene progress={0.6} />);
    expect(scene).toHaveAttribute('data-landed', '3');
    expect(count(container, 'page-landed')).toBe(3);

    rerender(<PizzaScene progress={1} />);
    expect(count(container, 'page-landed')).toBe(5);
    expect(count(container, 'page-spinning')).toBe(0);
  });

  it('ignores progress outside 0 to 1', () => {
    const { rerender } = render(<PizzaScene progress={-1} />);
    expect(screen.getByTestId('pizza-scene')).toHaveAttribute('data-landed', '0');
    rerender(<PizzaScene progress={Number.NaN} />);
    expect(screen.getByTestId('pizza-scene')).toHaveAttribute('data-landed', '0');
    rerender(<PizzaScene progress={4} pages={3} />);
    expect(screen.getByTestId('pizza-scene')).toHaveAttribute('data-landed', '3');
  });

  it('has Pip spinning the page until done', () => {
    const { container } = render(<PizzaScene progress={0.2} />);
    expect(container.querySelector('[data-pose="hold"]')).not.toBeNull();
    expect(container.querySelector('[data-part="page-spinning"]')).toHaveAttribute(
      'data-spinning',
      'true',
    );
    expect(count(container, 'swirl')).toBe(1);
    expect(count(container, 'flour')).toBe(3);
  });

  it('keeps still with reduced motion', () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <PizzaScene progress={0.4} />
      </MotionConfig>,
    );
    expect(container.querySelector('[data-part="page-spinning"]')).toHaveAttribute(
      'data-spinning',
      'false',
    );
    expect(count(container, 'swirl')).toBe(0);
    expect(count(container, 'flour')).toBe(0);
  });
});
