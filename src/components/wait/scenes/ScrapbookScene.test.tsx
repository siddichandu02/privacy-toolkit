import { render, screen } from '@testing-library/react';
import { MotionConfig } from 'framer-motion';
import { describe, expect, it } from 'vitest';
import { ScrapbookScene } from './ScrapbookScene';

const count = (c: HTMLElement, part: string) => c.querySelectorAll(`[data-part="${part}"]`).length;

describe('ScrapbookScene', () => {
  it('pins a photo for each share of progress', () => {
    const { container, rerender } = render(<ScrapbookScene progress={0} />);
    const scene = screen.getByTestId('scrapbook-scene');
    expect(scene).toHaveAttribute('data-pinned', '0');
    expect(count(container, 'photo-held')).toBe(1);
    expect(count(container, 'cover')).toBe(0);

    rerender(<ScrapbookScene progress={0.5} />);
    expect(scene).toHaveAttribute('data-pinned', '2');
    expect(count(container, 'photo-pinned')).toBe(2);
    expect(count(container, 'pin')).toBe(2);
  });

  it('shuts the book when every photo is in', () => {
    const { container } = render(<ScrapbookScene progress={1} />);
    expect(screen.getByTestId('scrapbook-scene')).toHaveAttribute('data-closed', 'true');
    expect(count(container, 'photo-held')).toBe(0);
    expect(count(container, 'cover')).toBe(1);
    expect(container.querySelector('[data-pose="celebrate"]')).not.toBeNull();
  });

  it('ignores progress outside 0 to 1', () => {
    const { rerender } = render(<ScrapbookScene progress={-2} />);
    const scene = screen.getByTestId('scrapbook-scene');
    expect(scene).toHaveAttribute('data-pinned', '0');
    rerender(<ScrapbookScene progress={Number.NaN} />);
    expect(scene).toHaveAttribute('data-pinned', '0');
    rerender(<ScrapbookScene progress={9} />);
    expect(scene).toHaveAttribute('data-pinned', '4');
  });

  it('keeps still with reduced motion', () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <ScrapbookScene progress={0.3} />
      </MotionConfig>,
    );
    expect(container.querySelector('[data-part="photo-held"]')).toHaveAttribute(
      'data-bobbing',
      'false',
    );
    expect(container.querySelector('[data-pose="hold"]')).not.toBeNull();
  });

  it('pins the real photos when it has them', () => {
    const { container } = render(
      <ScrapbookScene progress={0.5} photos={['blob:cat', 'blob:dog']} />,
    );
    const hrefs = [...container.querySelectorAll('image')].map((i) => i.getAttribute('href'));
    expect(hrefs).toEqual(['blob:cat', 'blob:dog', 'blob:cat']);
  });

  it('has a helper on the page, then ties a ribbon with sparkles at the end', () => {
    const { container, rerender } = render(<ScrapbookScene progress={0.5} />);
    const scene = screen.getByTestId('scrapbook-scene');
    expect(scene).toHaveAttribute('data-act', 'pinning');
    expect(container.querySelector('[data-part="helper"]')).not.toBeNull();
    expect(container.querySelector('[data-part="ribbon"]')).toBeNull();
    expect(container.querySelector('[data-part="sparkle"]')).toBeNull();
    rerender(<ScrapbookScene progress={1} />);
    expect(scene).toHaveAttribute('data-act', 'finale');
    expect(container.querySelector('[data-part="bow"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-part="sparkle"]')).toHaveLength(3);
  });
});
