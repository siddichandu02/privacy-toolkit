import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionConfig } from 'framer-motion';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PdfPages } from '../drop/preview';
import type { Placement } from '../../lib/pdf/signature-place';
import { SignaturePlacer } from './SignaturePlacer';

function makePages(): PdfPages {
  return {
    count: 1,
    render: vi.fn(async (_page: number, width: number) => `blob:page-${width}`),
    // A4 in points.
    size: vi.fn(async () => ({ width: 595, height: 842 })),
    close: vi.fn(),
  };
}

function Harness({ pages, start }: { pages: PdfPages; start: Placement }) {
  const [place, setPlace] = useState(start);
  return (
    <MotionConfig reducedMotion="always">
      <SignaturePlacer
        pages={pages}
        page={0}
        signatureUrl="blob:sig"
        aspect={0.3}
        place={place}
        onPlaceChange={setPlace}
        accent="sky"
      />
    </MotionConfig>
  );
}

const zoomOf = () => Number(screen.getByTestId('sign-view').dataset.zoom);
const level = () => screen.getByTestId('zoom-level').textContent;
const box = () => screen.getByTestId('signature-box');

beforeEach(() => {
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});

describe('SignaturePlacer zoom', () => {
  it('starts fitted to the page and zooms in and out in steps', async () => {
    const user = userEvent.setup();
    render(<Harness pages={makePages()} start={{ x: 0.4, y: 0.7, w: 0.3 }} />);
    expect(screen.getByRole('button', { name: 'Fit page' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const fitted = zoomOf();
    expect(fitted).toBeLessThan(1);

    await user.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(zoomOf()).toBeGreaterThan(fitted);
    expect(screen.getByRole('button', { name: 'Fit page' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await user.click(screen.getByRole('button', { name: /Show at actual size/ }));
    expect(level()).toBe('100%');
    await user.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(level()).toBe('75%');
  });

  it('keeps the signature where it is on the page at every zoom', async () => {
    const user = userEvent.setup();
    render(<Harness pages={makePages()} start={{ x: 0.4, y: 0.7, w: 0.3 }} />);
    const before = { ...box().dataset };
    const zoomIn = screen.getByRole('button', { name: 'Zoom in' });
    for (let i = 0; i < 12 && !zoomIn.hasAttribute('disabled'); i++) await user.click(zoomIn);
    expect(level()).toBe('400%');
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeDisabled();
    expect(box().dataset.x).toBe(before.x);
    expect(box().dataset.y).toBe(before.y);
    expect(box().dataset.w).toBe(before.w);
    // The sheet grows with the zoom: A4 is 793 px wide at 100%.
    expect(parseFloat(screen.getByTestId('sign-sheet').style.width)).toBeCloseTo(
      595 * (96 / 72) * 4,
    );
  });

  it('zooms with Ctrl + = and -, and fits with Ctrl + 0', async () => {
    const user = userEvent.setup();
    render(<Harness pages={makePages()} start={{ x: 0.4, y: 0.7, w: 0.3 }} />);
    const fitted = zoomOf();
    box().focus();
    await user.keyboard('{Control>}={/Control}');
    expect(zoomOf()).toBeGreaterThan(fitted);
    await user.keyboard('{Control>}-{/Control}{Control>}-{/Control}');
    expect(zoomOf()).toBeLessThan(fitted + 0.001);
    await user.keyboard('{Control>}0{/Control}');
    expect(zoomOf()).toBeCloseTo(fitted);
    // Ctrl + = zooms and does not resize the signature.
    expect(box().dataset.w).toBe('0.3000');
  });

  it('zooms at the cursor with Ctrl + wheel, and a plain wheel only scrolls', () => {
    render(<Harness pages={makePages()} start={{ x: 0.4, y: 0.7, w: 0.3 }} />);
    const view = screen.getByTestId('sign-view');
    const fitted = zoomOf();
    fireEvent.wheel(view, { deltaY: 100 });
    expect(zoomOf()).toBe(fitted);
    fireEvent.wheel(view, { deltaY: -100, ctrlKey: true });
    expect(zoomOf()).toBeGreaterThan(fitted);
  });

  it('nudges by one screen pixel, finer when zoomed in', async () => {
    const user = userEvent.setup();
    render(<Harness pages={makePages()} start={{ x: 0.4, y: 0.7, w: 0.3 }} />);
    box().focus();
    await user.keyboard('{ArrowRight}');
    const fittedStep = Number(box().dataset.x) - 0.4;
    await user.click(screen.getByRole('button', { name: /Show at actual size/ }));
    box().focus();
    const x = Number(box().dataset.x);
    await user.keyboard('{ArrowRight}');
    const realStep = Number(box().dataset.x) - x;
    expect(realStep).toBeCloseTo(1 / (595 * (96 / 72)), 3);
    expect(realStep).toBeLessThan(fittedStep);
  });

  it('draws the page again, sharper, after zooming in', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const pages = makePages();
    render(<Harness pages={pages} start={{ x: 0.4, y: 0.7, w: 0.3 }} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    const first = Number(screen.getByTestId('sign-page-image').dataset.renderWidth);
    fireEvent.click(screen.getByRole('button', { name: /Show at actual size/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    const sharp = Number(screen.getByTestId('sign-page-image').dataset.renderWidth);
    expect(sharp).toBeGreaterThan(first);
    expect(sharp).toBeGreaterThanOrEqual(595 * (96 / 72) * 1.25);
    vi.useRealTimers();
  });
});
