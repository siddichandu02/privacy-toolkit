import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionConfig } from 'framer-motion';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTool, type ToolInfo } from '../../tools';
import type { ResizeJob } from '../../workers/useResizeJob';
import { ResizeTool } from './ResizeTool';

vi.mock('../drop/preview', () => ({
  isPdf: () => false,
  makePreview: vi.fn(async () => ({ url: null, pages: null })),
}));

const state = vi.hoisted(() => ({
  job: { status: 'idle' } as ResizeJob,
  start: vi.fn(),
  reset: vi.fn(),
  decode: vi.fn(),
}));
vi.mock('../../workers/useResizeJob', () => ({
  useResizeJob: () => ({ job: state.job, start: state.start, reset: state.reset }),
}));
vi.mock('../../lib/image/heic', () => ({ prefetchHeic: vi.fn(), decodeHeic: state.decode }));

const tool = getTool('resize') as ToolInfo;
const ui = () => (
  <MotionConfig reducedMotion="always">
    <ResizeTool tool={tool} />
  </MotionConfig>
);

const file = (name: string, type: string) => new File([new Uint8Array(2048)], name, { type });

/** jsdom never loads images, so pretend the photo arrived at this size. */
function load(width: number, height: number) {
  const img = screen.getByTestId('cropper-photo') as HTMLImageElement;
  Object.defineProperty(img, 'naturalWidth', { value: width, configurable: true });
  Object.defineProperty(img, 'naturalHeight', { value: height, configurable: true });
  fireEvent.load(img);
}

async function setup(f = file('beach.jpg', 'image/jpeg')) {
  const user = userEvent.setup();
  render(ui());
  await user.upload(screen.getByTestId('file-input'), f);
  await screen.findByTestId('cropper-photo');
  load(4000, 3000);
  await waitFor(() => expect(screen.getByTestId('resize-summary')).toHaveTextContent('4000'));
  return { user, file: f };
}

beforeEach(() => {
  state.job = { status: 'idle' };
  state.start.mockReset();
  state.reset.mockReset();
  state.decode.mockReset();
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:photo');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});

describe('ResizeTool', () => {
  it('starts on passport size and sends a centred crop', async () => {
    const { user, file: f } = await setup();
    expect(screen.getByRole('radio', { name: /^Passport/ })).toBeChecked();
    expect(screen.getByTestId('size-tag')).toHaveTextContent('413 × 531');
    expect(screen.getByTestId('resize-notes')).toHaveTextContent(/Official rules vary/);
    await user.click(screen.getByRole('button', { name: 'Cut to 413 × 531' }));
    const request = state.start.mock.calls[0]?.[0];
    expect(request).toMatchObject({
      file: f,
      originalName: 'beach.jpg',
      settings: { width: 413, height: 531, type: 'image/jpeg' },
    });
    const crop = request.settings.crop;
    // A 7:9 slice from the middle of a 4:3 photo: full height, centred.
    expect(crop.height).toBeCloseTo(1);
    expect(crop.x + crop.width / 2).toBeCloseTo(0.5);
    expect((crop.width * 4000) / (crop.height * 3000)).toBeCloseTo(413 / 531, 2);
  });

  it('moves the crop with the arrow keys and zooms with plus', async () => {
    const { user } = await setup();
    await user.click(screen.getByRole('radio', { name: /Instagram post/ }));
    screen.getByTestId('crop-frame').focus();
    await user.keyboard('{Shift>}{ArrowRight}{/Shift}');
    await user.keyboard('+');
    await user.click(screen.getByRole('button', { name: 'Cut to 1080 × 1080' }));
    const crop = state.start.mock.calls[0]?.[0].settings.crop;
    expect(crop.width).toBeLessThan(0.75);
    expect(crop.x + crop.width / 2).toBeGreaterThan(0.5);
  });

  it('warns when a small photo would be stretched', async () => {
    const user = userEvent.setup();
    render(ui());
    await user.upload(screen.getByTestId('file-input'), file('tiny.png', 'image/png'));
    await screen.findByTestId('cropper-photo');
    load(300, 200);
    await user.click(await screen.findByRole('radio', { name: /Story/ }));
    expect(screen.getByTestId('resize-notes')).toHaveTextContent(/stretched and will look softer/);
    expect(screen.getByTestId('resize-summary')).toHaveTextContent('saved as PNG');
  });

  it('keeps the whole photo for a custom size, with height following width', async () => {
    const { user } = await setup();
    await user.click(screen.getByRole('radio', { name: /Custom/ }));
    const width = screen.getByLabelText('Width');
    expect(width).toHaveValue('4000');
    await user.clear(width);
    await user.type(width, '1200');
    expect(screen.getByLabelText('Height')).toHaveValue('900');
    expect(screen.getByLabelText('Zoom')).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Resize to 1200 × 900' }));
    expect(state.start.mock.calls[0]?.[0].settings).toMatchObject({
      width: 1200,
      height: 900,
      crop: null,
    });
  });

  it('cuts to exact custom numbers when the whole photo is not kept', async () => {
    const { user } = await setup();
    await user.click(screen.getByRole('radio', { name: /Custom/ }));
    await user.click(screen.getByRole('checkbox', { name: /Keep the whole photo/ }));
    const height = screen.getByLabelText('Height');
    await user.clear(height);
    await user.type(height, '4000');
    expect(screen.getByRole('button', { name: 'Cut to 4000 × 4000' })).toBeEnabled();
    await user.clear(height);
    await user.type(height, '90000');
    expect(screen.getByRole('alert')).toHaveTextContent(/whole pixels from 1 to 8000/);
    expect(screen.getByRole('button', { name: 'Pick a size' })).toBeDisabled();
  });

  it('opens a HEIC photo on the device and cuts that copy', async () => {
    const png = new File(['png'], 'IMG_1.HEIC', { type: 'image/png' });
    state.decode.mockResolvedValue(png);
    const user = userEvent.setup();
    render(ui());
    await user.upload(screen.getByTestId('file-input'), file('IMG_1.HEIC', ''));
    await screen.findByTestId('cropper-photo');
    load(3000, 4000);
    await user.click(await screen.findByRole('button', { name: 'Cut to 413 × 531' }));
    expect(state.decode).toHaveBeenCalledTimes(1);
    expect(state.start.mock.calls[0]?.[0]).toMatchObject({
      file: png,
      originalName: 'IMG_1.HEIC',
      settings: { type: 'image/jpeg' },
    });
  });

  it('says so when a HEIC photo cannot be opened', async () => {
    state.decode.mockRejectedValue(new Error('bad'));
    const user = userEvent.setup();
    render(ui());
    await user.upload(screen.getByTestId('file-input'), file('IMG_2.heic', ''));
    expect(await screen.findByText(/IMG_2\.heic could not be opened/)).toBeVisible();
    expect(screen.getByRole('button', { name: /Cut to/ })).toBeDisabled();
  });

  it('shows the finished photo and its size', () => {
    state.job = {
      status: 'done',
      blob: new Blob(['x'], { type: 'image/jpeg' }),
      name: 'beach-400x400.jpg',
      width: 400,
      height: 400,
      before: 4096,
      after: 1024,
    };
    render(ui());
    expect(screen.getByRole('heading', { name: 'Your photo is 400 × 400' })).toBeVisible();
    expect(screen.getByText(/4 KB to 1 KB/)).toBeVisible();
    expect(screen.getByTestId('resize-result')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Download photo' })).toBeVisible();
  });
});
