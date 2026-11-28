import { act, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CompressDemo } from './CompressDemo';
import { paintScene } from './sampleScene';

vi.mock('./sampleScene', async (real) => ({
  ...(await real<typeof import('./sampleScene')>()),
  paintScene: vi.fn(),
}));

describe('CompressDemo', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.mocked(paintScene).mockClear();
  });

  it('waits to paint until the section comes near the screen', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      {} as CanvasRenderingContext2D,
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(() => {});
    let show: () => void = () => {};
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: IntersectionObserverCallback) {
          show = () => cb([{ isIntersecting: true } as IntersectionObserverEntry], this as never);
        }
        observe() {}
        disconnect() {}
      },
    );
    vi.stubGlobal('requestIdleCallback', (run: () => void) => setTimeout(run, 0));
    vi.stubGlobal('cancelIdleCallback', (id: number) => clearTimeout(id));

    const { getByRole } = render(<CompressDemo />, { wrapper: MemoryRouter });
    expect(getByRole('heading', { name: 'See compression up close' })).toBeInTheDocument();
    await act(() => new Promise((r) => setTimeout(r, 10)));
    expect(paintScene).not.toHaveBeenCalled();

    show();
    await act(() => new Promise((r) => setTimeout(r, 10)));
    expect(paintScene).toHaveBeenCalledTimes(1);
  });

  it('stays out of the way where the browser cannot draw', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const { container } = render(<CompressDemo />);
    expect(container).toBeEmptyDOMElement();
  });

  it('hides too if the canvas is blocked', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { container } = render(<CompressDemo />);
    expect(container).toBeEmptyDOMElement();
  });
});
