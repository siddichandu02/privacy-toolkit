import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FileName } from './FileName';

describe('FileName', () => {
  it('offers line breaks after dashes, underscores and dots', () => {
    const { container } = render(<FileName name="my-big_report.pdf" />);
    expect(container.textContent).toBe('my-big_report.pdf');
    expect(container.querySelectorAll('wbr')).toHaveLength(3);
  });

  it('adds nothing to a plain name', () => {
    const { container } = render(<FileName name="scan" />);
    expect(container.querySelectorAll('wbr')).toHaveLength(0);
  });
});
