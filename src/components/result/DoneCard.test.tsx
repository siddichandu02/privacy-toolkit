import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionConfig } from 'framer-motion';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DoneCard, SEAL_MS } from './DoneCard';

const blob = new Blob(['%PDF-1.7'], { type: 'application/pdf' });

function card(onAgain = vi.fn()) {
  return (
    <DoneCard
      accent="mint"
      title="Your PDF is ready"
      fileName="Report-merged.pdf"
      blob={blob}
      details="2 files joined, 8 B."
      downloadLabel="Download PDF"
      actions={[{ label: 'Merge other PDFs', onClick: onAgain }]}
    />
  );
}

beforeEach(() => {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:result');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('DoneCard with reduced motion', () => {
  const still = (node: React.ReactNode) => (
    <MotionConfig reducedMotion="always">{node}</MotionConfig>
  );

  it('opens straight away with the heading focused and no confetti', async () => {
    render(still(card()));
    const heading = screen.getByRole('heading', { name: 'Your PDF is ready' });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.queryByTestId('sealed-face')).not.toBeInTheDocument();
    expect(screen.queryByTestId('confetti')).not.toBeInTheDocument();
  });

  it('downloads the file under its name', () => {
    render(still(card()));
    const link = screen.getByRole('link', { name: 'Download PDF' });
    expect(link).toHaveAttribute('href', 'blob:result');
    expect(link).toHaveAttribute('download', 'Report-merged.pdf');
    expect(screen.getByText(/2 files joined, 8 B\. Made on this device/)).toBeInTheDocument();
  });

  it('runs the extra actions', async () => {
    const onAgain = vi.fn();
    const user = userEvent.setup();
    render(still(card(onAgain)));
    await user.click(screen.getByRole('button', { name: 'Merge other PDFs' }));
    expect(onAgain).toHaveBeenCalledOnce();
  });

  it('revokes the download link when it goes away', () => {
    const { unmount } = render(still(card()));
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:result');
  });
});

describe('DoneCard with motion', () => {
  it('starts sealed, then turns over with confetti and focuses the heading', () => {
    vi.useFakeTimers();
    const { container } = render(card());
    const root = () => container.querySelector('[data-phase]');
    expect(root()).toHaveAttribute('data-phase', 'sealed');
    expect(screen.getByTestId('sealed-face')).toHaveTextContent('Sealing Report-merged.pdf');
    expect(screen.queryByTestId('confetti')).not.toBeInTheDocument();
    const heading = screen.getByRole('heading', { name: 'Your PDF is ready', hidden: true });
    expect(heading).not.toHaveFocus();

    act(() => {
      vi.advanceTimersByTime(SEAL_MS);
    });
    expect(root()).not.toHaveAttribute('data-phase', 'sealed');
    expect(screen.getByTestId('confetti').children.length).toBeGreaterThan(10);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(root()).toHaveAttribute('data-phase', 'open');
    expect(heading).toHaveFocus();
  });
});
