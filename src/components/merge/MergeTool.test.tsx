import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionConfig } from 'framer-motion';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOLS } from '../../tools';
import type { MergeJob } from '../../workers/useMergeJob';
import { MergeTool } from './MergeTool';

vi.mock('../drop/preview', () => ({
  isPdf: (f: File) => f.name.endsWith('.pdf'),
  makePreview: vi.fn(async () => ({ url: null, pages: 2 })),
}));

const state = vi.hoisted(() => ({
  job: { status: 'idle' } as MergeJob,
  start: vi.fn(),
  reset: vi.fn(),
}));
vi.mock('../../workers/useMergeJob', () => ({
  useMergeJob: () => ({ job: state.job, start: state.start, reset: state.reset }),
}));

const pdf = (name: string) => new File([new Uint8Array(64)], name, { type: 'application/pdf' });
const tool = TOOLS[0] as (typeof TOOLS)[number];

function setup() {
  const user = userEvent.setup();
  const view = render(
    <MotionConfig reducedMotion="always">
      <MergeTool tool={tool} />
    </MotionConfig>,
  );
  return { user, ...view };
}

beforeEach(() => {
  state.job = { status: 'idle' };
  state.start.mockReset();
  state.reset.mockReset();
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:merged');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});

describe('MergeTool', () => {
  it('needs two files before it can merge', async () => {
    const { user } = setup();
    await user.upload(screen.getByTestId('file-input'), [pdf('a.pdf')]);
    const button = await screen.findByRole('button', { name: 'Merge PDFs' });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription('Add at least one more PDF to merge.');
  });

  it('merges the files in list order', async () => {
    const { user } = setup();
    const a = pdf('a.pdf');
    const b = pdf('b.pdf');
    await user.upload(screen.getByTestId('file-input'), [a, b]);
    await user.click(await screen.findByRole('button', { name: 'Merge 2 PDFs' }));
    expect(state.start).toHaveBeenCalledWith([a, b]);
  });

  it('shows the pancake scene while running', async () => {
    const { user, rerender } = setup();
    await user.upload(screen.getByTestId('file-input'), [pdf('a.pdf'), pdf('b.pdf')]);
    state.job = { status: 'running', stage: 'working', progress: 0.5 };
    rerender(
      <MotionConfig reducedMotion="always">
        <MergeTool tool={tool} />
      </MotionConfig>,
    );
    const bar = await screen.findByRole('progressbar', { name: 'Merging 2 PDFs' });
    expect(bar).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getAllByText('Joining the pages').length).toBeGreaterThan(0);
  });

  it('offers the merged file for download and focuses the heading', async () => {
    const { user, rerender } = setup();
    await user.upload(screen.getByTestId('file-input'), [pdf('Report.pdf'), pdf('b.pdf')]);
    state.job = { status: 'done', blob: new Blob(['%PDF']), size: 4, pages: 5 };
    rerender(
      <MotionConfig reducedMotion="always">
        <MergeTool tool={tool} />
      </MotionConfig>,
    );
    const heading = await screen.findByRole('heading', { name: 'Your PDF is ready' });
    await waitFor(() => expect(heading).toHaveFocus());
    const link = screen.getByRole('link', { name: 'Download PDF' });
    expect(link).toHaveAttribute('download', 'Report-merged.pdf');
    expect(link).toHaveAttribute('href', 'blob:merged');
    expect(screen.getByText(/2 files joined, 5 pages, 4 B\./)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Change the order' }));
    expect(state.reset).toHaveBeenCalled();
  });

  it('explains a failure and can retry', async () => {
    const { user, rerender } = setup();
    await user.upload(screen.getByTestId('file-input'), [pdf('a.pdf'), pdf('b.pdf')]);
    state.job = { status: 'error', message: 'b.pdf could not be read.', fileName: 'b.pdf' };
    rerender(
      <MotionConfig reducedMotion="always">
        <MergeTool tool={tool} />
      </MotionConfig>,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('b.pdf could not be read.');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(state.start).toHaveBeenCalledTimes(1);
  });
});
