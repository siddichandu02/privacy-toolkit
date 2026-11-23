import { render, screen } from '@testing-library/react';
import { MotionConfig } from 'framer-motion';
import { describe, expect, it } from 'vitest';
import { alongPattern, patternBox } from './tailorPath';
import { TailorScene } from './TailorScene';

const part = (c: HTMLElement, name: string) => c.querySelector(`[data-part="${name}"]`);

describe('TailorScene', () => {
  it('cuts along the pattern as progress grows', () => {
    const { container, rerender } = render(<TailorScene progress={0} />);
    const scene = screen.getByTestId('tailor-scene');
    expect(scene).toHaveAttribute('data-act', 'intro');
    expect(part(container, 'cut')).toHaveAttribute('stroke-dasharray', '0 1');

    rerender(<TailorScene progress={0.5} />);
    expect(scene).toHaveAttribute('data-cut', '50');
    expect(scene).toHaveAttribute('data-act', 'action');
    expect(part(container, 'cut')).toHaveAttribute('stroke-dasharray', '0.5 1');
    expect(part(container, 'shears')).not.toBeNull();
    expect(part(container, 'piece')).toBeNull();
  });

  it('lifts the piece with its size tag at the end', () => {
    const { container } = render(<TailorScene progress={1} label="400 × 400" />);
    expect(screen.getByTestId('tailor-scene')).toHaveAttribute('data-act', 'finale');
    expect(part(container, 'piece')).not.toBeNull();
    expect(part(container, 'size-tag')).toHaveTextContent('400 × 400');
    expect(part(container, 'shears')).toBeNull();
    expect(container.querySelector('[data-pose="celebrate"]')).not.toBeNull();
  });

  it('shows the user photo when given', () => {
    const { container } = render(<TailorScene progress={0.2} thumb="blob:photo" />);
    expect(part(container, 'real-photo')).toHaveAttribute('href', 'blob:photo');
  });

  it('ignores progress outside 0 to 1', () => {
    const { rerender } = render(<TailorScene progress={Number.NaN} />);
    expect(screen.getByTestId('tailor-scene')).toHaveAttribute('data-cut', '0');
    rerender(<TailorScene progress={3} />);
    expect(screen.getByTestId('tailor-scene')).toHaveAttribute('data-act', 'finale');
  });

  it('keeps the shears still with reduced motion', () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <TailorScene progress={0.4} />
      </MotionConfig>,
    );
    expect(part(container, 'shears-at')).toHaveAttribute('data-snipping', 'false');
  });
});

describe('pattern maths', () => {
  it('fits the shape inside the photo with room to trim', () => {
    const wide = patternBox(4);
    const tall = patternBox(9 / 16);
    expect(wide.w / wide.h).toBeCloseTo(4);
    expect(tall.w / tall.h).toBeCloseTo(9 / 16);
    expect(patternBox(Number.NaN).w).toBeCloseTo(patternBox(1).w);
  });

  it('walks clockwise from the top left corner', () => {
    const box = { x: 0, y: 0, w: 10, h: 10 };
    expect(alongPattern(box, 0)).toEqual({ x: 0, y: 0, angle: 0 });
    expect(alongPattern(box, 0.125)).toEqual({ x: 5, y: 0, angle: 0 });
    expect(alongPattern(box, 0.375)).toEqual({ x: 10, y: 5, angle: 90 });
    expect(alongPattern(box, 0.625)).toEqual({ x: 5, y: 10, angle: 180 });
    expect(alongPattern(box, 1)).toEqual({ x: 0, y: 0, angle: 270 });
  });
});
