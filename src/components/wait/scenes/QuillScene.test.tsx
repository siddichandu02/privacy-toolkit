import { render, screen } from '@testing-library/react';
import { MotionConfig } from 'framer-motion';
import { describe, expect, it } from 'vitest';
import { QuillScene } from './QuillScene';

const part = (c: HTMLElement, name: string) => c.querySelector(`[data-part="${name}"]`);

describe('QuillScene', () => {
  it('dips, signs and adds a flourish as progress moves', () => {
    const { container, rerender } = render(<QuillScene progress={0.05} />);
    const scene = screen.getByTestId('quill-scene');
    expect(scene).toHaveAttribute('data-phase', 'dipping');
    expect(part(container, 'signature')).toHaveAttribute('data-drawn', '0.00');

    rerender(<QuillScene progress={0.5} />);
    expect(scene).toHaveAttribute('data-phase', 'signing');
    expect(part(container, 'signature')).toHaveAttribute('data-drawn', '0.50');

    rerender(<QuillScene progress={0.9} />);
    expect(scene).toHaveAttribute('data-phase', 'flourish');
    expect(part(container, 'signature')).toHaveAttribute('data-drawn', '1.00');
  });

  it('celebrates when the signature is done', () => {
    const { container } = render(<QuillScene progress={1} />);
    expect(screen.getByTestId('quill-scene')).toHaveAttribute('data-phase', 'done');
    expect(part(container, 'sparkles')).not.toBeNull();
    expect(container.querySelector('[data-pose="celebrate"]')).not.toBeNull();
  });

  it('ignores progress outside 0 to 1', () => {
    const { rerender } = render(<QuillScene progress={Number.NaN} />);
    expect(screen.getByTestId('quill-scene')).toHaveAttribute('data-phase', 'dipping');
    rerender(<QuillScene progress={7} />);
    expect(screen.getByTestId('quill-scene')).toHaveAttribute('data-phase', 'done');
  });

  it('keeps still with reduced motion', () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <QuillScene progress={0.05} />
      </MotionConfig>,
    );
    expect(part(container, 'quill')).toHaveAttribute('data-dipping', 'false');
  });
});
