import { act, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { __test } from '../../lib/netWatch';
import { HowItWorks } from './HowItWorks';

type Callback = (entries: { isIntersecting: boolean; target: Element }[]) => void;
const observers: { cb: Callback; els: Element[] }[] = [];

/** jsdom has no IntersectionObserver; this one lets a test "scroll" a step into view. */
class FakeObserver {
  els: Element[] = [];
  constructor(cb: Callback) {
    observers.push({ cb, els: this.els });
  }
  observe(el: Element) {
    this.els.push(el);
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

const reach = (el: Element) =>
  act(() => {
    for (const o of observers) {
      if (o.els.includes(el)) o.cb([{ isIntersecting: true, target: el }]);
    }
  });

describe('HowItWorks', () => {
  beforeAll(() => {
    vi.stubGlobal('IntersectionObserver', FakeObserver);
  });
  afterEach(() => {
    __test.reset();
    observers.length = 0;
  });

  it('lists the three steps in order, the first one current', () => {
    render(<HowItWorks />);
    const steps = within(screen.getByRole('list', { name: 'Three steps' })).getAllByRole(
      'listitem',
    );
    expect(steps.map((s) => s.querySelector('h3')?.textContent)).toEqual([
      'Drop your file in',
      'Your device does the work',
      'Save the result',
    ]);
    expect(steps[0]).toHaveAttribute('aria-current', 'step');
  });

  it('moves the current step as each one reaches the middle of the screen', () => {
    render(<HowItWorks />);
    const steps = within(screen.getByRole('list', { name: 'Three steps' })).getAllByRole(
      'listitem',
    );
    reach(steps[2] as HTMLElement);
    expect(steps[2]).toHaveAttribute('aria-current', 'step');
    expect(steps[0]).not.toHaveAttribute('aria-current');
  });

  it('shows a live zero while requests stay on this site', () => {
    render(<HowItWorks />);
    act(() =>
      __test.record([{ name: '/privacy-toolkit/assets/app.js', startTime: 1, transferSize: 900 }]),
    );
    expect(screen.getByTestId('story-sent')).toHaveTextContent(/^0 B$/);
  });

  it('turns coral and counts bytes if anything goes to another site', () => {
    render(<HowItWorks />);
    act(() =>
      __test.record([{ name: 'https://elsewhere.example/x', startTime: 1, transferSize: 2048 }]),
    );
    const sent = screen.getByTestId('story-sent');
    expect(sent).toHaveTextContent('2 KB');
    expect(sent.className).toContain('text-coral');
  });
});
