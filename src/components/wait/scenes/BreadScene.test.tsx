import { render, screen } from '@testing-library/react';
import { MotionConfig } from 'framer-motion';
import { describe, expect, it } from 'vitest';
import { BreadScene } from './BreadScene';

describe('BreadScene', () => {
  it('cuts slices off the loaf as progress grows', () => {
    const { container, rerender } = render(<BreadScene progress={0} />);
    const scene = screen.getByTestId('bread-scene');
    expect(scene).toHaveAttribute('data-cut', '0');
    expect(container.querySelectorAll('[data-part="slice-loaf"]')).toHaveLength(6);

    rerender(<BreadScene progress={0.5} />);
    expect(scene).toHaveAttribute('data-cut', '3');
    expect(container.querySelectorAll('[data-part="slice-cut"]')).toHaveLength(3);
    expect(container.querySelectorAll('[data-part="slice-loaf"]')).toHaveLength(3);

    rerender(<BreadScene progress={1} slices={8} />);
    expect(scene).toHaveAttribute('data-cut', '8');
    expect(container.querySelectorAll('[data-part="slice-loaf"]')).toHaveLength(0);
  });

  it('ignores progress outside 0 to 1', () => {
    const { rerender } = render(<BreadScene progress={-2} />);
    expect(screen.getByTestId('bread-scene')).toHaveAttribute('data-cut', '0');
    rerender(<BreadScene progress={Number.NaN} />);
    expect(screen.getByTestId('bread-scene')).toHaveAttribute('data-cut', '0');
    rerender(<BreadScene progress={3} />);
    expect(screen.getByTestId('bread-scene')).toHaveAttribute('data-cut', '6');
  });

  it('has Pip holding the knife, sawing until done', () => {
    const { container, rerender } = render(<BreadScene progress={0.3} />);
    expect(container.querySelector('[data-pose="hold"]')).not.toBeNull();
    expect(container.querySelector('[data-part="knife"]')).toHaveAttribute('data-sawing', 'true');
    expect(container.querySelector('[data-part="crumbs"]')).not.toBeNull();
    rerender(<BreadScene progress={1} />);
    expect(container.querySelector('[data-part="knife"]')).toHaveAttribute('data-sawing', 'false');
    expect(container.querySelector('[data-part="crumbs"]')).toBeNull();
  });

  it('keeps still with reduced motion', () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <BreadScene progress={0.4} />
      </MotionConfig>,
    );
    expect(container.querySelector('[data-part="knife"]')).toHaveAttribute('data-sawing', 'false');
    expect(container.querySelector('[data-part="crumbs"]')).toBeNull();
  });
});
