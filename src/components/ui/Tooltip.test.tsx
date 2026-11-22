import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tooltip } from './Tooltip';

function Example() {
  return (
    <Tooltip content="Nothing leaves your device" delay={0}>
      <button type="button">Privacy</button>
    </Tooltip>
  );
}

describe('Tooltip', () => {
  it('appears on keyboard focus and is linked to the trigger', async () => {
    render(<Example />);
    await userEvent.tab();
    const tip = await screen.findByRole('tooltip');
    expect(tip).toHaveTextContent('Nothing leaves your device');
    expect(screen.getByRole('button')).toHaveAttribute('aria-describedby', tip.id);
  });

  it('hides on Escape', async () => {
    render(<Example />);
    await userEvent.tab();
    await screen.findByRole('tooltip');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
  });

  it('shows on hover and hides on leave', async () => {
    render(<Example />);
    await userEvent.hover(screen.getByRole('button'));
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
    await userEvent.unhover(screen.getByRole('button'));
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
  });
});
