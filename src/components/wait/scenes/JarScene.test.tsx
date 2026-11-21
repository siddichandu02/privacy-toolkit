import { render, screen } from '@testing-library/react';
import { MotionConfig } from 'framer-motion';
import { describe, expect, it } from 'vitest';
import { JarScene } from './JarScene';

describe('JarScene', () => {
  it('fills the jar with pages as progress grows', () => {
    const { rerender } = render(<JarScene progress={0} />);
    expect(screen.getByTestId('jar-scene')).toHaveAttribute('data-in-jar', '1');
    rerender(<JarScene progress={0.5} />);
    expect(screen.getByTestId('jar-scene')).toHaveAttribute('data-in-jar', '3');
  });

  it('has Pip and helpers tossing pages while it works', () => {
    const { container } = render(<JarScene progress={0.4} />);
    expect(container.querySelector('[data-pose="hold"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-part="helper"]').length).toBe(3);
    expect(container.querySelector('[data-part="flying-page"]')).not.toBeNull();
    expect(container.querySelector('[data-part="bound-document"]')).toBeNull();
  });

  it('uses the real first pages when it has them', () => {
    const { container } = render(<JarScene progress={0.5} thumbs={['blob:one', 'blob:two']} />);
    const hrefs = [...container.querySelectorAll('image')].map((i) => i.getAttribute('href'));
    expect(hrefs).toContain('blob:one');
    expect(hrefs).toContain('blob:two');
  });

  it('pops out one bound document at the end', () => {
    const { container } = render(<JarScene progress={1} thumbs={['blob:one']} />);
    expect(screen.getByTestId('jar-scene')).toHaveAttribute('data-act', 'finale');
    expect(container.querySelector('[data-part="bound-document"]')).not.toBeNull();
    expect(container.querySelector('[data-pose="celebrate"]')).not.toBeNull();
    expect(container.querySelector('[data-part="flying-page"]')).toBeNull();
  });

  it('keeps still with reduced motion', () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <JarScene progress={0.4} />
      </MotionConfig>,
    );
    expect(container.querySelector('[data-part="flying-page"]')).toBeNull();
  });
});
