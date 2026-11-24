import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionConfig } from 'framer-motion';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { summarizeDetails } from '../../lib/image/exif-details';
import { getTool, type ToolInfo } from '../../tools';
import type { ExifJob } from '../../workers/useExifJob';
import { ExifTool } from './ExifTool';
import { batchLine, singleLine } from './lines';

vi.mock('../drop/preview', () => ({
  isPdf: () => false,
  makePreview: vi.fn(async () => ({ url: null, pages: null })),
}));

const state = vi.hoisted(() => ({
  job: { status: 'idle' } as ExifJob,
  start: vi.fn(),
  reset: vi.fn(),
  details: new Map<string, Record<string, unknown>>(),
}));
vi.mock('../../workers/useExifJob', () => ({
  useExifJob: () => ({ job: state.job, start: state.start, reset: state.reset }),
}));
vi.mock('../../lib/image/heic', () => ({ prefetchHeic: vi.fn() }));
vi.mock('../../lib/image/exif-read', async () => {
  const { summarizeDetails: sum } = await import('../../lib/image/exif-details');
  return {
    prefetchExifReader: vi.fn(),
    // Tests say what each file holds by its name.
    readPhotoDetails: vi.fn(async (bytes: ArrayBuffer) => {
      const name = new TextDecoder().decode(bytes);
      return sum(state.details.get(name) ?? {});
    }),
  };
});

const tool = getTool('exif') as ToolInfo;
const ui = () => (
  <MotionConfig reducedMotion="always">
    <ExifTool tool={tool} />
  </MotionConfig>
);

/** The file's bytes are its own name, which the fake reader looks up. */
const file = (name: string, type = 'image/jpeg') => new File([name], name, { type });

const PARIS = {
  latitude: 48.85837,
  longitude: 2.294481,
  DateTimeOriginal: '2024:07:14 18:22:05',
  Make: 'Apple',
  Model: 'iPhone 15 Pro',
  ColorSpace: 1,
  ExifVersion: '0232',
};

beforeEach(() => {
  state.job = { status: 'idle' };
  state.start.mockReset();
  state.reset.mockReset();
  state.details.clear();
});

async function setup(files: File[]) {
  const user = userEvent.setup();
  const view = render(ui());
  await user.upload(screen.getByTestId('file-input'), files);
  return { user, ...view };
}

describe('ExifTool', () => {
  it('lists what one photo gives away, most revealing first', async () => {
    state.details.set('paris.jpg', PARIS);
    await setup([file('paris.jpg')]);
    await waitFor(() =>
      expect(screen.getByTestId('exif-headline')).toHaveTextContent(
        'Anyone who gets this photo can see where it was taken, when and which camera or phone took it.',
      ),
    );
    const groups = within(screen.getByTestId('findings'))
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent);
    expect(groups).toEqual(['Where it was taken', 'When it was taken', 'The camera or phone']);
    expect(screen.getByTestId('findings')).toHaveTextContent('48.85837° N, 2.29448° E');
    expect(screen.getByTestId('globe')).toBeInTheDocument();
    expect(screen.getByText('Plus 2 technical details. All of it goes.')).toBeInTheDocument();
  });

  it('says so when a photo holds nothing personal, and still offers a clean copy', async () => {
    state.details.set('scan.png', { ColorSpace: 1 });
    const { user } = await setup([file('scan.png', 'image/png')]);
    expect(await screen.findByTestId('findings-empty')).toHaveTextContent('1 technical detail,');
    await user.click(screen.getByRole('button', { name: 'Remove details' }));
    expect(state.start).toHaveBeenCalledOnce();
  });

  it('marks the photos in a batch that show a place, and lets you look inside each', async () => {
    state.details.set('paris.jpg', PARIS);
    state.details.set('logo.png', { Software: 'Sketchbook' });
    const { user } = await setup([file('paris.jpg'), file('logo.png', 'image/png')]);
    await waitFor(() =>
      expect(screen.getByTestId('exif-headline')).toHaveTextContent(
        '1 of 2 photos show where they were taken.',
      ),
    );
    expect(screen.getAllByTestId('exif-thumb-pin')).toHaveLength(1);
    const logo = screen.getByRole('button', { name: 'logo.png: Apps' });
    await user.click(logo);
    expect(logo).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('findings')).toHaveTextContent('Sketchbook');
    expect(screen.queryByTestId('globe')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Clean 2 photos' }));
    expect(state.start).toHaveBeenCalledWith([expect.any(File), expect.any(File)]);
  });

  it('shows HEIC notes and a stand-in picture for HEIC photos', async () => {
    await setup([file('IMG_1.HEIC', '')]);
    expect(
      await screen.findByText('HEIC photos are opened on this device and saved as JPG.'),
    ).toBeInTheDocument();
  });

  it('tells what was kept on the done card', () => {
    state.job = {
      status: 'done',
      blob: new Blob(['zip'], { type: 'application/zip' }),
      name: 'photos-without-details.zip',
      items: [
        { name: 'a.jpg', before: 10, after: 8, method: 'lossless' },
        { name: 'IMG_1.jpg', before: 10, after: 9, method: 'redrawn' },
      ],
      skipped: [{ name: 'bad.jpg', reason: 'x' }],
    };
    render(ui());
    expect(screen.getByRole('heading', { name: 'Your photos are clean' })).toBeInTheDocument();
    expect(screen.getByText(/1 saved again as a new file/)).toBeInTheDocument();
    expect(screen.getByText(/Left out bad\.jpg/)).toBeInTheDocument();
  });
});

describe('headline lines', () => {
  it('describes one photo', () => {
    expect(singleLine(summarizeDetails({ Artist: 'Sam' }))).toBe(
      'Anyone who gets this photo can see whose it is.',
    );
    expect(singleLine(summarizeDetails({}))).toMatch(/^Nothing personal/);
    expect(singleLine(summarizeDetails({ ISO: 100 }))).toMatch(/^Only technical details/);
  });

  it('describes a batch', () => {
    expect(batchLine(3, 3, 3)).toBe('All 3 photos show where they were taken.');
    expect(batchLine(3, 0, 2)).toBe(
      '2 of 3 photos carry hidden details about the camera or the date.',
    );
    expect(batchLine(2, 0, 0)).toMatch(/^Nothing personal is hidden in these 2 photos/);
  });
});
