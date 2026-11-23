import { render, screen } from '@testing-library/react';
import { MotionConfig } from 'framer-motion';
import { describe, expect, it } from 'vitest';
import { WashScene } from './WashScene';

describe('WashScene', () => {
  it('lights the ring round the door with progress', () => {
    const { rerender, container } = render(<WashScene progress={0} />);
    const scene = screen.getByTestId('wash-scene');
    expect(scene).toHaveAttribute('data-lit', '0');
    rerender(<WashScene progress={0.5} />);
    expect(scene).toHaveAttribute('data-lit', '6');
    expect(container.querySelectorAll('[data-part="lights"] [data-on="true"]')).toHaveLength(6);
  });

  it('ignores progress outside 0 to 1', () => {
    const { rerender } = render(<WashScene progress={Number.NaN} />);
    const scene = screen.getByTestId('wash-scene');
    expect(scene).toHaveAttribute('data-lit', '0');
    rerender(<WashScene progress={4} />);
    expect(scene).toHaveAttribute('data-lit', '12');
  });

  it('tumbles the photo while washing, with Pip holding the door', () => {
    const { container } = render(<WashScene progress={0.4} thumb="blob:photo" label="WebP" />);
    expect(screen.getByTestId('wash-scene')).toHaveAttribute('data-act', 'washing');
    expect(container.querySelector('[data-part="tumbling"] image')).toHaveAttribute(
      'href',
      'blob:photo',
    );
    expect(container.querySelector('[data-part="screen"]')).toHaveTextContent('WebP');
    expect(container.querySelector('[data-pose="hold"]')).not.toBeNull();
    expect(container.querySelector('[data-part="machine"]')).toHaveAttribute(
      'data-shaking',
      'true',
    );
    expect(container.querySelector('[data-part="hung"]')).toBeNull();
  });

  it('opens the door and hangs the photo with its new format at the end', () => {
    const { container } = render(<WashScene progress={1} label="PNG" />);
    expect(screen.getByTestId('wash-scene')).toHaveAttribute('data-act', 'finale');
    expect(container.querySelector('[data-part="door"]')).toHaveAttribute('data-open', 'true');
    expect(container.querySelector('[data-part="hung"] [data-part="tag"]')).toHaveTextContent(
      'PNG',
    );
    expect(container.querySelector('[data-part="tumbling"]')).toBeNull();
    expect(container.querySelector('[data-pose="celebrate"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-part="sparkle"]')).toHaveLength(3);
  });

  it('stays still with reduced motion', () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <WashScene progress={0.3} />
      </MotionConfig>,
    );
    expect(container.querySelector('[data-part="machine"]')).toHaveAttribute(
      'data-shaking',
      'false',
    );
  });
});
