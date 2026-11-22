import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CompressDemo } from './CompressDemo';

describe('CompressDemo', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stays out of the way where the browser cannot draw', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const { container } = render(<CompressDemo />);
    expect(container).toBeEmptyDOMElement();
  });

  it('hides too if drawing throws', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { container } = render(<CompressDemo />);
    expect(container).toBeEmptyDOMElement();
  });
});
