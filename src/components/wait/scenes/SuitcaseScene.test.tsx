import { render, screen } from '@testing-library/react';
import { MotionConfig } from 'framer-motion';
import { describe, expect, it } from 'vitest';
import { SuitcaseScene } from './SuitcaseScene';

describe('SuitcaseScene', () => {
  it('moves the zip along with progress', () => {
    const { rerender } = render(<SuitcaseScene progress={0} />);
    const scene = screen.getByTestId('suitcase-scene');
    expect(scene).toHaveAttribute('data-zip', '0');
    expect(scene).toHaveAttribute('data-zipped', 'false');
    rerender(<SuitcaseScene progress={0.42} />);
    expect(scene).toHaveAttribute('data-zip', '42');
  });

  it('zips shut and cheers at the end', () => {
    const { container } = render(<SuitcaseScene progress={1} />);
    expect(screen.getByTestId('suitcase-scene')).toHaveAttribute('data-zipped', 'true');
    expect(container.querySelector('[data-pose="celebrate"]')).not.toBeNull();
    expect(container.querySelector('[data-part="pip"]')).toHaveAttribute('data-bouncing', 'false');
  });

  it('ignores progress outside 0 to 1', () => {
    const { rerender } = render(<SuitcaseScene progress={-1} />);
    const scene = screen.getByTestId('suitcase-scene');
    expect(scene).toHaveAttribute('data-zip', '0');
    rerender(<SuitcaseScene progress={Number.NaN} />);
    expect(scene).toHaveAttribute('data-zip', '0');
    rerender(<SuitcaseScene progress={5} />);
    expect(scene).toHaveAttribute('data-zip', '100');
  });

  it('bounces while packing, but not with reduced motion', () => {
    const { container, unmount } = render(<SuitcaseScene progress={0.3} />);
    expect(container.querySelector('[data-part="pip"]')).toHaveAttribute('data-bouncing', 'true');
    unmount();
    const still = render(
      <MotionConfig reducedMotion="always">
        <SuitcaseScene progress={0.3} />
      </MotionConfig>,
    );
    expect(still.container.querySelector('[data-part="pip"]')).toHaveAttribute(
      'data-bouncing',
      'false',
    );
    expect(still.container.querySelector('[data-pose="sit"]')).not.toBeNull();
  });
});
