import { render, waitFor } from '@testing-library/react';
import { MotionConfig } from 'framer-motion';
import { TOOLS } from '../../tools';
import { Pip } from './Pip';
import { accessoryFor } from './accessories';

describe('Pip accessories', () => {
  it('has something for every tool', () => {
    for (const tool of TOOLS) expect(accessoryFor(tool.id)).not.toBeNull();
    expect(accessoryFor('nope')).toBeNull();
    expect(accessoryFor(null)).toBeNull();
  });

  it('wears a chef hat over merge and sunglasses over remove exif', () => {
    const { container, rerender } = render(<Pip accessory={accessoryFor('merge')} />);
    expect(container.querySelector('[data-accessory="chef-hat"]')).toBeInTheDocument();
    rerender(<Pip accessory={accessoryFor('exif')} />);
    expect(container.querySelector('[data-accessory="sunglasses"]')).toBeInTheDocument();
  });

  it('holds a knife over split, and puts it away after', async () => {
    const { container, rerender } = render(<Pip accessory="knife" />);
    expect(container.querySelector('[data-accessory="knife"]')).toBeInTheDocument();
    rerender(<Pip />);
    await waitFor(() =>
      expect(container.querySelector('[data-accessory]')).not.toBeInTheDocument(),
    );
  });

  it('only watches the pointer when asked and motion is allowed', () => {
    const { container, rerender } = render(<Pip />);
    expect(container.querySelector('svg')).toHaveAttribute('data-watching', 'false');
    rerender(<Pip watch />);
    expect(container.querySelector('svg')).toHaveAttribute('data-watching', 'true');
    rerender(
      <MotionConfig reducedMotion="always">
        <Pip watch />
      </MotionConfig>,
    );
    expect(container.querySelector('svg')).toHaveAttribute('data-watching', 'false');
  });
});
