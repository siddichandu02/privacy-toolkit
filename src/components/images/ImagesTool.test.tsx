import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionConfig } from 'framer-motion';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_OPTIONS } from '../../lib/pdf/images';
import { getTool } from '../../tools';
import type { ImagesJob } from '../../workers/useImagesJob';
import { ImagesTool } from './ImagesTool';

vi.mock('../drop/preview', () => ({
  isPdf: () => false,
  makePreview: vi.fn(async () => ({ url: null, pages: null })),
}));

const state = vi.hoisted(() => ({
  job: { status: 'idle' } as ImagesJob,
  start: vi.fn(),
  reset: vi.fn(),
}));
vi.mock('../../workers/useImagesJob', () => ({
  useImagesJob: () => ({ job: state.job, start: state.start, reset: state.reset }),
}));

const img = (name: string) => new File([new Uint8Array(64)], name, { type: 'image/png' });
const tool = getTool('images-to-pdf') as NonNullable<ReturnType<typeof getTool>>;

function setup() {
  const user = userEvent.setup();
  const view = render(
    <MotionConfig reducedMotion="always">
      <ImagesTool tool={tool} />
    </MotionConfig>,
  );
  return { user, ...view };
}

beforeEach(() => {
  state.job = { status: 'idle' };
  state.start.mockReset();
  state.reset.mockReset();
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:img');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});

describe('ImagesTool', () => {
  it('makes a pdf of the images in order with the default layout', async () => {
    const { user } = setup();
    const a = img('a.png');
    const b = img('b.png');
    await user.upload(screen.getByTestId('file-input'), [a, b]);
    await user.click(await screen.findByRole('button', { name: 'Make a 2-page PDF' }));
    expect(state.start).toHaveBeenCalledWith({ files: [a, b], options: DEFAULT_OPTIONS });
  });

  it('sends the picked page size, orientation and margin', async () => {
    const { user } = setup();
    await user.upload(screen.getByTestId('file-input'), [img('a.png')]);
    await user.click(await screen.findByRole('radio', { name: 'Letter' }));
    await user.click(screen.getByRole('radio', { name: 'Landscape' }));
    await user.click(screen.getByRole('radio', { name: 'None' }));
    await user.click(screen.getByRole('button', { name: 'Make PDF' }));
    expect(state.start).toHaveBeenCalledWith(
      expect.objectContaining({
        options: { size: 'letter', orientation: 'landscape', margin: 'none' },
      }),
    );
  });

  it('turns the preview with the orientation and locks it for fit image', async () => {
    const { user } = setup();
    await user.upload(screen.getByTestId('file-input'), [img('a.png')]);
    const preview = await screen.findByTestId('page-preview');
    // A 4:3 stand-in until the image opens, so auto gives a landscape page.
    expect(preview).toHaveAttribute('data-orientation', 'landscape');
    await user.click(screen.getByRole('radio', { name: 'Portrait' }));
    expect(preview).toHaveAttribute('data-orientation', 'portrait');

    await user.click(screen.getByRole('radio', { name: 'Fit image' }));
    const group = screen.getByRole('group', { name: 'Orientation' });
    expect(group).toBeDisabled();
    expect(group).toHaveAccessibleDescription('Each page takes the shape of its image.');
  });

  it('steps through the pages in the preview', async () => {
    const { user } = setup();
    await user.upload(screen.getByTestId('file-input'), [img('a.png'), img('b.png')]);
    expect(await screen.findByText('Page 1 of 2')).toBeInTheDocument();
    const back = screen.getByRole('button', { name: 'Show the previous page' });
    expect(back).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Show the next page' }));
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show the next page' })).toBeDisabled();
  });

  it('shows the scrapbook while working', () => {
    state.job = { status: 'running', stage: 'working', progress: 0.5 };
    // Full motion: with reduced motion the wait screen swaps the scene for a still Pip.
    render(<ImagesTool tool={tool} />);
    expect(screen.getByTestId('scrapbook-scene')).toBeInTheDocument();
    expect(screen.getAllByText('Pinning them onto pages').length).toBeGreaterThan(0);
  });

  it('offers the download when done', async () => {
    state.job = {
      status: 'done',
      blob: new Blob(['%PDF'], { type: 'application/pdf' }),
      name: 'a-and-1-more.pdf',
      pages: 2,
    };
    const { user } = setup();
    expect(screen.getByRole('heading', { name: 'Your PDF is ready' })).toBeInTheDocument();
    expect(screen.getByText(/2 pages, 4 B\./)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Change the layout' }));
    expect(state.reset).toHaveBeenCalled();
  });

  it('names the image that failed', () => {
    state.job = {
      status: 'error',
      message: 'b.heic is a HEIC photo, and this browser cannot open those yet.',
      fileName: 'b.heic',
    };
    setup();
    expect(screen.getByRole('heading', { name: 'The PDF was not made' })).toBeInTheDocument();
    expect(screen.getByText(/b\.heic is a HEIC photo/)).toBeInTheDocument();
  });
});
