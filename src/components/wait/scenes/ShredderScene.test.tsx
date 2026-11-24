import { render, screen } from '@testing-library/react';
import { MotionConfig } from 'framer-motion';
import { describe, expect, it } from 'vitest';
import { ShredderScene } from './ShredderScene';

const part = (c: HTMLElement, name: string) => c.querySelector(`[data-part="${name}"]`);

describe('ShredderScene', () => {
  it('shreds one tag at a time as progress passes each mark', () => {
    const { container, rerender } = render(<ShredderScene progress={0.1} />);
    const scene = screen.getByTestId('shredder-scene');
    expect(scene).toHaveAttribute('data-act', 'intro');
    expect(part(container, 'screen')).toHaveTextContent('3');
    expect(part(container, 'tag-date')).toHaveAttribute('data-gone', 'false');

    rerender(<ShredderScene progress={0.4} />);
    expect(scene).toHaveAttribute('data-shredded', '1');
    expect(scene).toHaveAttribute('data-act', 'shredding');
    expect(part(container, 'tag-date')).toHaveAttribute('data-gone', 'true');
    expect(part(container, 'tag-camera')).toHaveAttribute('data-gone', 'false');
    expect(part(container, 'screen')).toHaveTextContent('2');

    rerender(<ShredderScene progress={0.9} />);
    expect(part(container, 'tag-location')).toHaveAttribute('data-gone', 'true');
    expect(part(container, 'strips')?.querySelectorAll('rect')).toHaveLength(21);
  });

  it('puts sunglasses on Pip at the end', () => {
    const { container } = render(<ShredderScene progress={1} />);
    expect(screen.getByTestId('shredder-scene')).toHaveAttribute('data-act', 'finale');
    expect(part(container, 'screen')).toHaveTextContent('✓');
    expect(container.querySelector('[data-pose="celebrate"]')).not.toBeNull();
    expect(container.querySelector('[data-accessory="sunglasses"]')).not.toBeNull();
    expect(part(container, 'sparkles')).not.toBeNull();
  });

  it('shows the user photo when given', () => {
    const { container } = render(<ShredderScene progress={0.2} thumb="blob:photo" />);
    expect(part(container, 'photo')).toHaveAttribute('href', 'blob:photo');
  });

  it('ignores progress outside 0 to 1', () => {
    const { rerender } = render(<ShredderScene progress={Number.NaN} />);
    expect(screen.getByTestId('shredder-scene')).toHaveAttribute('data-shredded', '0');
    rerender(<ShredderScene progress={4} />);
    expect(screen.getByTestId('shredder-scene')).toHaveAttribute('data-act', 'finale');
  });

  it('keeps the shredder still with reduced motion', () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <ShredderScene progress={0.7} />
      </MotionConfig>,
    );
    expect(part(container, 'shredder')).toHaveAttribute('data-buzzing', 'false');
  });
});
