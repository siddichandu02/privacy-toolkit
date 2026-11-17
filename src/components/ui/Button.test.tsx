import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('is a real button that defaults to type="button"', () => {
    render(<Button>Merge files</Button>);
    expect(screen.getByRole('button', { name: 'Merge files' })).toHaveAttribute('type', 'button');
  });

  it('fires onClick from mouse and keyboard', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('does not fire when disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Go
      </Button>,
    );
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('uses the accent fill for the accent variant', () => {
    render(
      <Button variant="accent" accent="mint">
        Compress
      </Button>,
    );
    expect(screen.getByRole('button')).toHaveClass('bg-mint');
  });

  it('hides the icon from assistive tech', () => {
    render(<Button icon={<svg data-testid="icon" />}>Download</Button>);
    expect(screen.getByTestId('icon').parentElement).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
  });
});
