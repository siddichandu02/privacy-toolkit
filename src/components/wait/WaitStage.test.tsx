import { render, screen, within } from '@testing-library/react';
import { MotionConfig } from 'framer-motion';
import { WaitStage } from './WaitStage';

describe('WaitStage', () => {
  it('exposes overall progress as a progressbar', () => {
    render(<WaitStage title="Merging 3 PDFs" current="working" progress={0.5} />);
    const bar = screen.getByRole('progressbar', { name: 'Merging 3 PDFs' });
    expect(bar).toHaveAttribute('aria-valuenow', '50');
    expect(bar).toHaveAttribute('aria-valuetext', 'Doing the work, 50%');
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('marks finished, current and upcoming steps', () => {
    render(<WaitStage title="Merging" current="working" progress={0} />);
    const items = within(screen.getByRole('list', { name: 'Steps' })).getAllByRole('listitem');
    expect(items.map((li) => li.dataset.state)).toEqual(['done', 'current', 'next']);
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    expect(items[0]).toHaveTextContent('(done)');
  });

  it('announces the step politely when it changes', () => {
    const { rerender } = render(<WaitStage title="Merging" current="reading" progress={1} />);
    const live = screen.getByTestId('step-announcer');
    expect(live).toHaveAttribute('aria-live', 'polite');
    expect(live).toHaveTextContent('Reading your files');
    rerender(<WaitStage title="Merging" current="packing" progress={0.2} />);
    expect(live).toHaveTextContent('Packing it up');
  });

  it('uses custom steps', () => {
    render(
      <WaitStage
        title="Signing"
        steps={[
          { id: 'ink', label: 'Dipping the quill' },
          { id: 'sign', label: 'Signing' },
        ]}
        current="sign"
        progress={0.5}
      />,
    );
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '75');
  });

  it('plays the given scene', () => {
    render(<WaitStage title="Merging" current="reading" progress={0} scene={<p>pancakes</p>} />);
    expect(screen.getByText('pancakes')).toBeInTheDocument();
  });

  it('swaps the scene for a still Pip with reduced motion', () => {
    render(
      <MotionConfig reducedMotion="always">
        <WaitStage title="Merging" current="reading" progress={0} scene={<p>pancakes</p>} />
      </MotionConfig>,
    );
    expect(screen.queryByText('pancakes')).not.toBeInTheDocument();
    const pip = screen.getByTestId('scene').querySelector('svg[data-pose]');
    expect(pip).toHaveAttribute('data-animated', 'false');
  });
});
