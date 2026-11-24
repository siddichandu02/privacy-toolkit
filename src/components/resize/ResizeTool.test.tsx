import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionConfig } from 'framer-motion';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cropBox, type CropView } from '../../lib/image/resize-names';
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
vi.mock('../../lib/image/heic', () => ({
  prefetchHeic: vi.fn(),
  decodeHeicOnce: (f: File) => state.decode(f),
}));

const tool = getTool('resize') as ToolInfo;
const ui = () => (
  <MotionConfig reducedMotion="always">
    <ResizeTool tool={tool} />
  </MotionConfig>
);

const file = (name: string, type: string) => new File([new Uint8Array(2048)], name, { type });

type Sent = [File[], { width: number; height: number; views: (CropView | null)[] }];

/** The crop the worker will make from the framing sent for photo `i`. */
function sentCrop(i: number, w = 4000, h = 3000) {
  const [, settings] = state.start.mock.calls[0] as Sent;
  const view = settings.views[i] ?? { x: 0.5, y: 0.5, zoom: 1 };
  return cropBox(w, h, settings.width / settings.height, view);
}

/** jsdom never loads images, so pretend the photo arrived at this size. */
function load(width: number, height: number, el?: HTMLElement) {
  const img = (el ?? screen.getByTestId('cropper-photo')) as HTMLImageElement;
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
    const [files, settings] = state.start.mock.calls[0] as Sent;
    expect(files).toEqual([f]);
    expect(settings).toMatchObject({ width: 413, height: 531, cut: true, views: [null] });
    const crop = sentCrop(0);
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
    const crop = sentCrop(0);
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
    expect(state.start.mock.calls[0]?.[1]).toMatchObject({ width: 1200, height: 900, cut: false });
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

  it('opens a HEIC photo on the device to show it and sends the picked file', async () => {
    const png = new File(['png'], 'IMG_1.HEIC', { type: 'image/png' });
    state.decode.mockResolvedValue(png);
    const user = userEvent.setup();
    const heic = file('IMG_1.HEIC', '');
    render(ui());
    await user.upload(screen.getByTestId('file-input'), heic);
    await screen.findByTestId('cropper-photo');
    load(3000, 4000);
    expect(screen.getByTestId('resize-summary')).toHaveTextContent('saved as JPG');
    await user.click(await screen.findByRole('button', { name: 'Cut to 413 × 531' }));
    expect(state.decode).toHaveBeenCalledWith(heic);
    // The job decodes it through the same once-per-file cache, so no second decode.
    expect(state.start.mock.calls[0]?.[0]).toEqual([heic]);
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
      items: [
        {
          name: 'beach-400x400.jpg',
          width: 400,
          height: 400,
          sourceWidth: 4000,
          sourceHeight: 3000,
          before: 4096,
          after: 1024,
        },
      ],
      skipped: [],
    };
    render(ui());
    expect(screen.getByRole('heading', { name: 'Your photo is 400 × 400' })).toBeVisible();
    expect(screen.getByText(/4 KB to 1 KB/)).toBeVisible();
    expect(screen.getByTestId('resize-result')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Download photo' })).toBeVisible();
  });

  it('frames each photo of a batch on its own and cuts them all', async () => {
    const user = userEvent.setup();
    render(ui());
    const a = file('a.jpg', 'image/jpeg');
    const b = file('b.jpg', 'image/jpeg');
    await user.upload(screen.getByTestId('file-input'), [a, b]);
    const thumbs = await screen.findAllByTestId('resize-thumb');
    expect(thumbs).toHaveLength(2);
    for (const t of thumbs) load(4000, 3000, t.querySelector('img') as HTMLElement);
    load(4000, 3000);
    expect(screen.getByTestId('resize-notes')).toHaveTextContent(/centred. Pick a photo above/);

    await user.click(thumbs[1] as HTMLElement);
    expect(thumbs[1]).toHaveAttribute('aria-pressed', 'true');
    load(4000, 3000);
    screen.getByTestId('crop-frame').focus();
    await user.keyboard('{Shift>}{ArrowRight}{/Shift}');
    await waitFor(() => expect(thumbs[1]).toHaveAttribute('data-moved', 'true'));
    expect(thumbs[0]).toHaveAttribute('data-moved', 'false');
    expect(screen.getByTestId('resize-notes')).toHaveTextContent(/moved the frame on 1 photo/);

    await user.click(screen.getByRole('button', { name: 'Cut 2 photos to 413 × 531' }));
    const [files, settings] = state.start.mock.calls[0] as Sent;
    expect(files).toEqual([a, b]);
    expect(settings.views[0]).toBeNull();
    expect(sentCrop(1).x).toBeGreaterThan(sentCrop(0).x);
  });

  it('fits a batch inside custom numbers without tying the sides', async () => {
    const user = userEvent.setup();
    render(ui());
    await user.upload(screen.getByTestId('file-input'), [
      file('a.jpg', 'image/jpeg'),
      file('b.png', 'image/png'),
    ]);
    await screen.findByTestId('cropper-photo');
    load(4000, 3000);
    await user.click(screen.getByRole('radio', { name: /Custom/ }));
    const width = screen.getByLabelText('Width');
    const height = screen.getByLabelText('Height');
    await user.clear(width);
    await user.type(width, '1000');
    await user.clear(height);
    await user.type(height, '1000');
    expect(screen.getByText(/Each photo fits inside these numbers/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Fit 2 photos inside 1000 × 1000' }));
    expect(state.start.mock.calls[0]?.[1]).toMatchObject({ width: 1000, height: 1000, cut: false });
  });

  it('lists every resized photo of a batch and names the ones left out', () => {
    const item = {
      width: 400,
      height: 400,
      sourceWidth: 800,
      sourceHeight: 800,
      before: 2048,
      after: 1024,
    };
    state.job = {
      status: 'done',
      blob: new Blob(['zip'], { type: 'application/zip' }),
      name: 'resized-photos.zip',
      items: [
        { name: 'a-400x400.jpg', ...item },
        { name: 'b-400x400.png', ...item },
      ],
      skipped: [{ name: 'broken.jpg', reason: 'x' }],
    };
    render(ui());
    expect(screen.getByRole('heading', { name: /2 photos are now/ })).toBeVisible();
    expect(screen.getByText(/Left out broken\.jpg/)).toBeVisible();
    expect(screen.getByTestId('resized-list')).toHaveTextContent('b-400x400.png');
    expect(screen.getByRole('link', { name: 'Download ZIP' })).toBeVisible();
  });
});
