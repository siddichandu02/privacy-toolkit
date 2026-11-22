import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MotionConfig } from 'framer-motion';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __test } from '../../lib/netWatch';
import { HeroStory } from './HeroStory';

/** An observer that says the card is on screen straight away. */
class OnScreen {
  constructor(private cb: IntersectionObserverCallback) {}
  observe(el: Element) {
    this.cb(
      [{ isIntersecting: true, intersectionRatio: 1, target: el } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

const steps = () =>
  within(screen.getByRole('list', { name: 'Three steps' })).getAllByRole('listitem');
const current = () => steps().findIndex((li) => li.getAttribute('aria-current') === 'step');

describe('HeroStory', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('IntersectionObserver', OnScreen);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    __test.reset();
  });

  it('plays the three steps on a loop', () => {
    render(<HeroStory />);
    const titles = ['Drop your file in', 'Your device does the work', 'Save the result'];
    steps().forEach((li, i) => expect(li).toHaveTextContent(titles[i] ?? ''));
    expect(current()).toBe(0);
    act(() => vi.advanceTimersByTime(3000));
    expect(current()).toBe(1);
    act(() => vi.advanceTimersByTime(3300));
    expect(current()).toBe(2);
    act(() => vi.advanceTimersByTime(3300));
    expect(current()).toBe(0);
    expect(screen.getByRole('img')).toHaveAttribute('data-step', '0');
  });

  it('can be paused, and a step can be picked by hand', () => {
    render(<HeroStory />);
    fireEvent.click(screen.getByRole('button', { name: 'Pause the story' }));
    act(() => vi.advanceTimersByTime(20_000));
    expect(current()).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: /Save the result/ }));
    expect(current()).toBe(2);
    expect(screen.getByRole('button', { name: 'Play the story' })).toBeInTheDocument();
  });

  it('starts paused with reduced motion', () => {
    render(
      <MotionConfig reducedMotion="always">
        <HeroStory />
      </MotionConfig>,
    );
    expect(screen.getByTestId('hero-story')).toHaveAttribute('data-running', 'false');
    act(() => vi.advanceTimersByTime(10_000));
    expect(current()).toBe(0);
  });

  it('shows a live zero for bytes sent to other sites', () => {
    render(<HeroStory />);
    for (const pill of screen.getAllByTestId('story-sent'))
      expect(pill).toHaveTextContent('0 B sent');
  });
});
