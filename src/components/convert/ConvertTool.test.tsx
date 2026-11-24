import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionConfig } from 'framer-motion';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTool, type ToolInfo } from '../../tools';
import type { ConvertJob } from '../../workers/useConvertJob';
import { ConvertTool } from './ConvertTool';

vi.mock('../drop/preview', () => ({
  isPdf: () => false,
  makePreview: vi.fn(async () => ({ url: null, pages: null })),
}));

const state = vi.hoisted(() => ({
  job: { status: 'idle' } as ConvertJob,
  start: vi.fn(),
  reset: vi.fn(),
  prefetch: vi.fn(),
}));
vi.mock('../../workers/useConvertJob', () => ({
  useConvertJob: () => ({ job: state.job, start: state.start, reset: state.reset }),
}));
vi.mock('../../lib/image/heic', () => ({ prefetchHeic: state.prefetch }));

const tool = getTool('convert') as ToolInfo;
const ui = () => (
  <MotionConfig reducedMotion="always">
    <ConvertTool tool={tool} />
  </MotionConfig>
);

const file = (name: string, type: string) => new File([new Uint8Array(2048)], name, { type });

async function setup(files: File[]) {
  const user = userEvent.setup();
  const view = render(ui());
  await user.upload(screen.getByTestId('file-input'), files);
  const button = await screen.findByRole('button', { name: /^Convert/ });
  await waitFor(() => expect(button).toBeVisible());
  return { user, files, button, ...view };
}

const done = (over: Partial<Extract<ConvertJob, { status: 'done' }>> = {}): ConvertJob => ({
  status: 'done',
  blob: new Blob(['x'], { type: 'image/jpeg' }),
  name: 'IMG_1.jpg',
  items: [{ name: 'IMG_1.jpg', from: 'image/png', type: 'image/jpeg', before: 3000, after: 1000 }],
  skipped: [],
  fellBack: false,
  ...over,
});

beforeEach(() => {
  state.job = { status: 'idle' };
  state.start.mockReset();
  state.reset.mockReset();
  state.prefetch.mockReset();
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:photo');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});

describe('ConvertTool', () => {
  it('converts to JPG by default and sends the chosen format and quality', async () => {
    const { user, files, button } = await setup([file('logo.png', 'image/png')]);
    expect(button).toHaveAccessibleName('Convert to JPG');
    expect(screen.getByRole('radio', { name: /JPG/ })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: /WebP/ }));
    fireEvent.change(screen.getByLabelText('Quality'), { target: { value: '70' } });
    expect(screen.getByTestId('relabel-target')).toHaveTextContent('WebP');
    await user.click(screen.getByRole('button', { name: 'Convert to WebP' }));
    expect(state.start).toHaveBeenCalledWith(files, { to: 'webp', quality: 0.7 });
  });

  it('turns quality off for PNG', async () => {
    const { user } = await setup([file('a.jpg', 'image/jpeg')]);
    const slider = screen.getByLabelText('Quality');
    expect(slider).toBeEnabled();
    await user.click(screen.getByRole('radio', { name: /PNG/ }));
    expect(slider).toBeDisabled();
    expect(screen.getByText(/nothing to set/)).toBeVisible();
    expect(screen.getByText(/often several times bigger/)).toBeVisible();
  });

  it('sums up a mixed pile, warns about see-through parts and loads the HEIC decoder', async () => {
    await setup([file('a.heic', ''), file('b.HEIC', ''), file('c.png', 'image/png')]);
    expect(
      screen.getByRole('heading', { name: 'Convert 2 HEIC, 1 PNG to JPG' }),
    ).toBeInTheDocument();
    const notes = screen.getByTestId('convert-notes');
    expect(notes).toHaveTextContent(/HEIC photos are opened on this device first/);
    expect(notes).toHaveTextContent(/turn white/);
    expect(state.prefetch).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Convert 3 photos to JPG' })).toBeVisible();
  });

  it('shows the new sizes and left-out photos when done', () => {
    state.job = done({
      name: 'converted-photos.zip',
      items: [
        { name: 'a.jpg', from: 'image/png', type: 'image/jpeg', before: 3000, after: 1000 },
        { name: 'b.jpg', from: 'image/png', type: 'image/jpeg', before: 2048, after: 1024 },
      ],
      skipped: [{ name: 'broken.png', reason: 'x' }],
    });
    render(ui());
    expect(screen.getByRole('heading', { name: 'Your photos are now JPG' })).toBeVisible();
    expect(screen.getByText(/2 photos converted\./)).toBeVisible();
    expect(screen.getByText(/Left out broken\.png/)).toBeVisible();
    expect(screen.getByTestId('zip-contents')).toHaveTextContent(/b\.jpg\s*2 KB to 1 KB/);
    expect(screen.getByRole('button', { name: 'Save b.jpg' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Download ZIP' })).toBeVisible();
  });

  it('says so when the browser saved PNG instead of WebP', () => {
    state.job = done({
      name: 'a.png',
      items: [{ name: 'a.png', from: 'image/jpeg', type: 'image/png', before: 10, after: 30 }],
      fellBack: true,
    });
    render(ui());
    expect(screen.getByRole('heading', { name: 'Your photo is now PNG' })).toBeVisible();
    expect(screen.getByText(/cannot save JPG, so you get PNG/)).toBeVisible();
  });
});
