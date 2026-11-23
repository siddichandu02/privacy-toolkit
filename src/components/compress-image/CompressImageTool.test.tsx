import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionConfig } from 'framer-motion';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTool, type ToolInfo } from '../../tools';
import type { ImageCompressJob } from '../../workers/useImageCompressJob';
import type { ImagePreviewState } from '../../workers/useImagePreview';
import { CompressImageTool } from './CompressImageTool';

vi.mock('../drop/preview', () => ({
  isPdf: () => false,
  makePreview: vi.fn(async () => ({ url: null, pages: null })),
}));

const state = vi.hoisted(() => ({
  job: { status: 'idle' } as ImageCompressJob,
  start: vi.fn(),
  reset: vi.fn(),
  preview: { preview: null, busy: true, failed: false } as ImagePreviewState,
  previewFor: vi.fn(),
}));
vi.mock('../../workers/useImageCompressJob', () => ({
  useImageCompressJob: () => ({ job: state.job, start: state.start, reset: state.reset }),
}));
vi.mock('../../workers/useImagePreview', () => ({
  useImagePreview: (...args: unknown[]) => {
    state.previewFor(...args);
    return state.preview;
  },
}));

const tool = getTool('compress-image') as ToolInfo;
const ui = () => (
  <MotionConfig reducedMotion="always">
    <CompressImageTool tool={tool} />
  </MotionConfig>
);

const jpg = (name: string, size = 4096) =>
  new File([new Uint8Array(size)], name, { type: 'image/jpeg' });

async function setup(files = [jpg('beach.jpg')]) {
  const user = userEvent.setup();
  const view = render(ui());
  await user.upload(screen.getByTestId('file-input'), files);
  const name = files.length > 1 ? `Compress ${files.length} photos` : 'Compress photo';
  const button = await screen.findByRole('button', { name });
  await waitFor(() => expect(button).toBeVisible());
  return { user, files, button, ...view };
}

const done = (
  over: Partial<Extract<ImageCompressJob, { status: 'done' }>> = {},
): ImageCompressJob => ({
  status: 'done',
  blob: new Blob(['x'], { type: 'image/jpeg' }),
  name: 'beach-compressed.jpg',
  items: [
    { name: 'beach-compressed.jpg', type: 'image/jpeg', before: 4000, after: 1000, kept: false },
  ],
  skipped: [],
  before: 4000,
  after: 1000,
  ...over,
});

beforeEach(() => {
  state.job = { status: 'idle' };
  state.start.mockReset();
  state.reset.mockReset();
  state.previewFor.mockReset();
  state.preview = { preview: null, busy: true, failed: false };
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:photo');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});

describe('CompressImageTool', () => {
  it('sends the photos with the chosen quality, type and size', async () => {
    const { user, files, button } = await setup();
    const slider = screen.getByLabelText('Quality');
    expect(slider).toHaveValue('75');
    fireEvent.change(slider, { target: { value: '40' } });
    await user.click(screen.getByRole('radio', { name: 'WebP' }));
    await user.click(screen.getByRole('radio', { name: '1920' }));
    await user.click(button);
    expect(state.start).toHaveBeenCalledWith({
      files,
      settings: { quality: 0.4, format: 'webp', maxEdge: 1920 },
    });
    // The live preview follows the same settings.
    expect(state.previewFor).toHaveBeenLastCalledWith(files[0], {
      quality: 0.4,
      format: 'webp',
      maxEdge: 1920,
    });
  });

  it('shows the real size of the preview', async () => {
    state.preview = {
      preview: { url: 'blob:after', bytes: 1024, type: 'image/jpeg', width: 400, height: 300 },
      busy: false,
      failed: false,
    };
    await setup();
    expect(screen.getByTestId('preview-size')).toHaveTextContent(/4 KB\s*to\s*1 KB\s*75% smaller/);
    expect(screen.getByTestId('photo-compare-after')).toHaveAttribute('src', 'blob:after');
  });

  it('turns quality off for PNG and says why', async () => {
    const user = userEvent.setup();
    render(ui());
    await user.upload(screen.getByTestId('file-input'), [
      new File([new Uint8Array(64)], 'shot.png', { type: 'image/png' }),
    ]);
    const slider = await screen.findByLabelText('Quality');
    expect(slider).toBeDisabled();
    expect(screen.getByText(/PNG is saved without loss/)).toBeVisible();
    await user.click(screen.getByRole('radio', { name: 'JPG' }));
    expect(slider).toBeEnabled();
  });

  it('pages through several photos and offers one zip', async () => {
    const { user, files } = await setup([jpg('a.jpg'), jpg('b.jpg')]);
    expect(screen.getByText('Photo 1 of 2')).toBeVisible();
    expect(screen.getByText(/You get them back in one ZIP/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Show the next photo' }));
    expect(screen.getByText('Photo 2 of 2')).toBeVisible();
    expect(state.previewFor).toHaveBeenLastCalledWith(files[1], expect.anything());
  });

  it('explains a photo it cannot show', async () => {
    state.preview = { preview: null, busy: false, failed: true };
    await setup([new File([new Uint8Array(64)], 'phone.heic', { type: 'image/heic' })]);
    expect(screen.getByText(/cannot be shown in this browser/)).toBeVisible();
  });

  it('shows the saving and the left-out photos when done', () => {
    state.job = done({
      name: 'compressed-photos.zip',
      items: [
        { name: 'a-compressed.jpg', type: 'image/jpeg', before: 3000, after: 600, kept: false },
        { name: 'b.jpg', type: 'image/jpeg', before: 1000, after: 1000, kept: true },
      ],
      skipped: [{ name: 'phone.heic', reason: 'HEIC' }],
      after: 1600,
    });
    render(ui());
    expect(screen.getByRole('heading', { name: 'Your photos are smaller' })).toBeVisible();
    expect(screen.getByText(/2 photos compressed\. 1 kept as they were/)).toBeVisible();
    expect(screen.getByText(/Left out phone\.heic/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Download ZIP' })).toBeVisible();
  });

  it('hands back the original when nothing got smaller', () => {
    state.job = done({
      after: 4000,
      items: [{ name: 'beach.jpg', type: 'image/jpeg', before: 4000, after: 4000, kept: true }],
    });
    render(ui());
    expect(screen.getByRole('heading', { name: 'This photo is already lean' })).toBeVisible();
  });
});
