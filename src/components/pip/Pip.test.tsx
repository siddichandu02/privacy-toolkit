import { act, render, screen } from '@testing-library/react';
import { MotionConfig } from 'framer-motion';
import { afterEach, vi } from 'vitest';
import { Pip } from './Pip';

const svgOf = (c: HTMLElement) => c.querySelector('svg') as SVGSVGElement;
const part = (c: HTMLElement, name: string) =>
  c.querySelector(`[data-part="${name}"]`) as SVGGElement;

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('Pip', () => {
  it('is decorative by default', () => {
    const { container } = render(<Pip />);
    const svg = svgOf(container);
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('gets an accessible name when given a title', () => {
    render(<Pip title="Pip the paper fox" />);
    expect(screen.getByRole('img', { name: 'Pip the paper fox' })).toBeInTheDocument();
  });

  it('folds its paper from the chosen accent', () => {
    const { container } = render(<Pip accent="mint" />);
    expect(svgOf(container).style.getPropertyValue('--pip')).toBe('var(--mint)');
  });

  it('only shows the waving paw in the wave pose', () => {
    const { container, rerender } = render(<Pip />);
    expect(container.querySelector('[data-part="paw"]')).toBeNull();
    rerender(<Pip pose="wave" />);
    expect(container.querySelector('[data-part="paw"]')).not.toBeNull();
    expect(container.querySelector('svg')).toHaveAttribute('data-pose', 'wave');
  });

  it('shows a question mark when puzzled', () => {
    const { container } = render(<Pip pose="puzzled" />);
    expect(container.querySelector('[data-part="question"]')).toHaveTextContent('?');
  });

  it('throws both paws up to celebrate', () => {
    const { container } = render(<Pip pose="celebrate" />);
    expect(part(container, 'paws')).toBeInTheDocument();
    expect(part(container, 'scratch')).not.toBeInTheDocument();
  });

  it('shrugs with one paw out and the other scratching its head', () => {
    const { container } = render(<Pip pose="shrug" />);
    expect(part(container, 'paws')).toBeInTheDocument();
    expect(part(container, 'scratch')).toBeInTheDocument();
    expect(part(container, 'question')).not.toBeInTheDocument();
  });

  it('blinks every few seconds', () => {
    vi.useFakeTimers();
    // Longest gap, so the blink lands exactly at the end of the range
    vi.spyOn(Math, 'random').mockReturnValue(1);
    const { container } = render(<Pip />);
    const eyes = () => part(container, 'eyes');
    expect(container.querySelector('svg')).toHaveAttribute('data-animated', 'true');
    expect(eyes()).toHaveAttribute('data-blink', 'false');
    act(() => {
      vi.advanceTimersByTime(5600);
    });
    expect(eyes()).toHaveAttribute('data-blink', 'true');
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(eyes()).toHaveAttribute('data-blink', 'false');
  });

  it('holds still with reduced motion', () => {
    vi.useFakeTimers();
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <Pip pose="wave" />
      </MotionConfig>,
    );
    expect(container.querySelector('svg')).toHaveAttribute('data-animated', 'false');
    act(() => {
      vi.advanceTimersByTime(20_000);
    });
    expect(container.querySelector('[data-part="eyes"]')).toHaveAttribute('data-blink', 'false');
  });
});
