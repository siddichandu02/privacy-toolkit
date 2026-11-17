import { render } from '@testing-library/react';
import { TOOLS } from '../../tools';
import { ToolIcon } from './ToolIcon';

describe('ToolIcon', () => {
  it('has its own icon for every tool', () => {
    const fallback = render(<ToolIcon id="mystery" />).container.innerHTML;
    const drawn = TOOLS.map((t) => render(<ToolIcon id={t.id} />).container.innerHTML);
    expect(drawn).not.toContain(fallback);
    expect(new Set(drawn).size).toBe(TOOLS.length);
  });

  it('is hidden from screen readers', () => {
    const { container } = render(<ToolIcon id="merge" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('falls back to a plain page for unknown ids', () => {
    const { container } = render(<ToolIcon id="mystery" />);
    expect(container.querySelector('path')).not.toBeNull();
  });
});
