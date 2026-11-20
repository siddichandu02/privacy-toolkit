import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionConfig } from 'framer-motion';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTool, type ToolInfo } from '../../tools';
import type { CompressJob } from '../../workers/useCompressJob';
import { CompressTool } from './CompressTool';

vi.mock('../drop/preview', () => ({
  isPdf: (f: File) => f.name.endsWith('.pdf'),
  makePreview: vi.fn(async () => ({ url: null, pages: 2 })),
}));

const state = vi.hoisted(() => ({
  job: { status: 'idle' } as CompressJob,
  start: vi.fn(),
  reset: vi.fn(),
}));
vi.mock('../../workers/useCompressJob', () => ({
  useCompressJob: () => ({ job: state.job, start: state.start, reset: state.reset }),
}));

const tool = getTool('compress-pdf') as ToolInfo;
const ui = () => (
  <MotionConfig reducedMotion="always">
    <CompressTool tool={tool} />
  </MotionConfig>
);

const done = (over: Partial<Extract<CompressJob, { status: 'done' }>> = {}): CompressJob => ({
  status: 'done',
  blob: new Blob(['x'], { type: 'application/pdf' }),
  name: 'brochure-compressed.pdf',
  before: 4 * 1024 * 1024,
  after: 1024 * 1024,
  images: 3,
  shrunk: 3,
  smaller: true,
  ...over,
});

async function setup() {
  const user = userEvent.setup();
  const view = render(ui());
  const file = new File([new Uint8Array(2048)], 'brochure.pdf', { type: 'application/pdf' });
  await user.upload(screen.getByTestId('file-input'), [file]);
  await screen.findByRole('button', { name: 'Compress PDF' });
  return { user, file, ...view };
}

beforeEach(() => {
  state.job = { status: 'idle' };
  state.start.mockReset();
  state.reset.mockReset();
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:compress');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});

describe('CompressTool', () => {
  it('starts on balanced and explains each level', async () => {
    const { user } = await setup();
    expect(screen.getByRole('radio', { name: 'Balanced' })).toBeChecked();
    expect(screen.getByText(/re-saves large photos/)).toBeVisible();
    await user.click(screen.getByRole('radio', { name: 'Light' }));
    expect(screen.getByText(/Photos stay exactly as they are/)).toBeVisible();
    expect(screen.getByText('brochure.pdf is 2 KB. It stays as it is.')).toBeVisible();
  });

  it('sends the file and the picked level to the worker', async () => {
    const { user, file } = await setup();
    await user.click(screen.getByRole('radio', { name: 'Strong' }));
    await user.click(screen.getByRole('button', { name: 'Compress PDF' }));
    expect(state.start).toHaveBeenCalledWith({ file, level: 'strong' });
  });

  it('shows the suitcase while it works', () => {
    state.job = { status: 'running', stage: 'working', progress: 0.5 };
    render(ui());
    expect(screen.getByRole('progressbar', { name: 'Shrinking your PDF' })).toBeInTheDocument();
    expect(screen.getByTestId('step-announcer')).toHaveTextContent('Squeezing the photos');
  });

  it('shows old and new size when it got smaller', () => {
    state.job = done();
    render(ui());
    expect(screen.getByRole('heading', { name: 'Your PDF is smaller' })).toBeInTheDocument();
    expect(screen.getByText('3 photos re-saved.', { exact: false })).toBeInTheDocument();
    expect(
      screen.getByRole('figure', { name: '4 MB before, 1 MB after, 75% smaller' }),
    ).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download PDF' })).toHaveAttribute(
      'download',
      'brochure-compressed.pdf',
    );
  });

  it('hands back the original when it could not shrink', async () => {
    state.job = done({ smaller: false, after: 4 * 1024 * 1024, shrunk: 0 });
    const user = userEvent.setup();
    render(ui());
    expect(screen.getByRole('heading', { name: 'This PDF is already lean' })).toBeInTheDocument();
    expect(screen.queryByTestId('size-compare')).toBeNull();
    expect(screen.getByRole('link', { name: 'Download original' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try Strong' }));
    expect(state.reset).toHaveBeenCalled();
  });

  it('explains a failure and offers a retry', () => {
    state.job = {
      status: 'error',
      message: 'scan.pdf is password protected.',
      fileName: 'scan.pdf',
    };
    render(ui());
    expect(
      screen.getByRole('heading', { name: 'Your PDF was not compressed' }),
    ).toBeInTheDocument();
    expect(screen.getByText('scan.pdf is password protected.')).toBeInTheDocument();
  });
});
