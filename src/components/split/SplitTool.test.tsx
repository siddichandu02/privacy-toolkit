import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionConfig } from 'framer-motion';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTool, type ToolInfo } from '../../tools';
import type { SplitJob } from '../../workers/useSplitJob';
import { SplitTool } from './SplitTool';

vi.mock('../drop/preview', () => ({
  isPdf: (f: File) => f.name.endsWith('.pdf'),
  makePreview: vi.fn(async () => ({ url: null, pages: 6 })),
  openPdfPages: vi.fn(async () => ({
    count: 6,
    render: vi.fn(async () => null),
    close: vi.fn(),
  })),
}));

const state = vi.hoisted(() => ({
  job: { status: 'idle' } as SplitJob,
  start: vi.fn(),
  reset: vi.fn(),
}));
vi.mock('../../workers/useSplitJob', () => ({
  useSplitJob: () => ({ job: state.job, start: state.start, reset: state.reset }),
}));

const pdf = (name: string) => new File([new Uint8Array(64)], name, { type: 'application/pdf' });
const tool = getTool('split') as ToolInfo;
const ui = () => (
  <MotionConfig reducedMotion="always">
    <SplitTool tool={tool} />
  </MotionConfig>
);

async function setup() {
  const user = userEvent.setup();
  const view = render(ui());
  const file = pdf('report.pdf');
  await user.upload(screen.getByTestId('file-input'), [file]);
  await screen.findAllByTestId('page-tile');
  return { user, file, ...view };
}

const input = () => screen.getByLabelText('Pages to keep');

beforeEach(() => {
  state.job = { status: 'idle' };
  state.start.mockReset();
  state.reset.mockReset();
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:split');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});

describe('SplitTool', () => {
  it('shows a tile per page and waits for a pick', async () => {
    await setup();
    expect(screen.getAllByTestId('page-tile')).toHaveLength(6);
    expect(screen.getByText('Tap pages below or type them. This PDF has 6 pages.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Split PDF' })).toBeDisabled();
  });

  it('keeps tiles and typed ranges in step', async () => {
    const { user } = await setup();
    await user.click(screen.getByRole('button', { name: 'Page 2' }));
    await user.click(screen.getByRole('button', { name: 'Page 3' }));
    await user.click(screen.getByRole('button', { name: 'Page 6' }));
    expect(input()).toHaveValue('2-3, 6');

    await user.clear(input());
    await user.type(input(), '1, 4-5');
    expect(screen.getByRole('button', { name: 'Page 4' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('3 pages of 6 picked.')).toBeVisible();
  });

  it('shift-click picks the pages in between', async () => {
    const { user } = await setup();
    await user.click(screen.getByRole('button', { name: 'Page 2' }));
    await user.keyboard('{Shift>}');
    await user.click(screen.getByRole('button', { name: 'Page 5' }));
    await user.keyboard('{/Shift}');
    expect(input()).toHaveValue('2-5');
  });

  it('quick picks fill even pages and clear', async () => {
    const { user } = await setup();
    await user.click(screen.getByRole('button', { name: 'Even' }));
    expect(input()).toHaveValue('2, 4, 6');
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(input()).toHaveValue('');
  });

  it('explains bad input and blocks the button', async () => {
    const { user } = await setup();
    await user.type(input(), '4-2');
    expect(input()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('"4-2" runs backwards. Try 2-4.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Split PDF' })).toBeDisabled();
  });

  it('extracts into one PDF by default, in the typed order', async () => {
    const { user, file } = await setup();
    await user.type(input(), '5-6, 1');
    await user.click(screen.getByRole('button', { name: 'Extract 3 pages' }));
    expect(state.start).toHaveBeenCalledWith({
      file,
      files: [{ name: 'report-extract.pdf', pages: [5, 6, 1], label: 'pages 1, 5-6' }],
      zipName: 'report-extract.zip',
    });
  });

  it('offers three modes and starts on extract', async () => {
    await setup();
    expect(screen.getByRole('radio', { name: /Extract pages/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Split into parts/ })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /Split every page/ })).toHaveAccessibleName(
      /6 PDFs, one for each page/,
    );
  });

  it('previews the files as ranges are typed', async () => {
    const { user } = await setup();
    expect(screen.getByTestId('split-out-summary')).toHaveTextContent('Nothing yet');
    await user.type(input(), '2-4');
    const one = screen.getAllByTestId('output-file');
    expect(one).toHaveLength(1);
    expect(one[0]).toHaveTextContent('report-pages-2-4.pdf');
    expect(one[0]).toHaveTextContent('pages 2-4');
  });

  it('labels each range with its PDF in parts mode', async () => {
    const { user, file } = await setup();
    await user.click(screen.getByRole('radio', { name: /Split into parts/ }));
    await user.type(screen.getByLabelText('Ranges, one file each'), '1-2, 4');
    const tags = screen.getAllByTestId('page-group').map((t) => t.textContent);
    expect(tags).toEqual(['PDF 1', 'PDF 1', 'PDF 2']);
    const cards = screen.getAllByTestId('output-file').map((c) => c.textContent);
    expect(cards).toEqual([
      expect.stringContaining('report-part-1.pdfpages 1-2'),
      expect.stringContaining('report-part-2.pdfpage 4'),
    ]);
    expect(screen.getByTestId('split-out-summary')).toHaveTextContent(
      '2 PDFs, packed in report-parts.zip.',
    );
    await user.click(screen.getByRole('button', { name: 'Split into 2 PDFs' }));
    expect(state.start).toHaveBeenCalledWith(
      expect.objectContaining({ file, zipName: 'report-parts.zip' }),
    );
  });

  it('asks for a second range instead of making one file in parts mode', async () => {
    const { user } = await setup();
    await user.click(screen.getByRole('radio', { name: /Split into parts/ }));
    await user.type(screen.getByLabelText('Ranges, one file each'), '1-3');
    expect(screen.getByTestId('lone-part-hint')).toHaveTextContent(
      'Add another range (e.g. 1-3, 5-7) to get separate files.',
    );
    expect(screen.getByRole('button', { name: 'Split PDF' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Or extract these pages' }));
    expect(screen.getByRole('radio', { name: /Extract pages/ })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Extract 3 pages' })).toBeEnabled();
  });

  it('builds parts on the grid: click starts one, shift-click grows it', async () => {
    const { user } = await setup();
    await user.click(screen.getByRole('radio', { name: /Split into parts/ }));
    await user.click(screen.getByRole('button', { name: 'Page 1' }));
    await user.keyboard('{Shift>}');
    await user.click(screen.getByRole('button', { name: 'Page 3' }));
    await user.keyboard('{/Shift}');
    await user.click(screen.getByRole('button', { name: 'Page 5' }));
    expect(screen.getByLabelText('Ranges, one file each')).toHaveValue('1-3, 5');
    expect(screen.getByRole('button', { name: 'Page 5, PDF 2' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('presets fill the ranges', async () => {
    const { user } = await setup();
    await user.click(screen.getByRole('radio', { name: /Split into parts/ }));
    const ranges = () => screen.getByLabelText('Ranges, one file each');
    await user.click(screen.getByRole('button', { name: 'Every 2 pages' }));
    expect(ranges()).toHaveValue('1-2, 3-4, 5-6');
    await user.click(screen.getByRole('button', { name: 'More' }));
    expect(ranges()).toHaveValue('1-3, 4-6');
    await user.click(screen.getByRole('button', { name: 'Into 2 equal parts' }));
    await user.click(screen.getByRole('button', { name: 'More' }));
    expect(ranges()).toHaveValue('1-2, 3-4, 5-6');
    await user.click(screen.getByRole('button', { name: 'Every page' }));
    expect(screen.getAllByTestId('output-file')).toHaveLength(6);
    await user.type(ranges(), '0');
    expect(screen.getByRole('button', { name: 'Custom ranges' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('splits every page with one click', async () => {
    const { user, file } = await setup();
    await user.click(screen.getByRole('radio', { name: /Split every page/ }));
    expect(screen.queryByLabelText('Pages to keep')).toBeNull();
    expect(screen.getAllByTestId('output-file')).toHaveLength(6);
    await user.click(screen.getByRole('button', { name: 'Split into 6 PDFs' }));
    const req = state.start.mock.calls.at(-1)?.[0] as { file: File; files: { name: string }[] };
    expect(req.file).toBe(file);
    expect(req.files.map((f) => f.name)).toEqual([
      'report-page-1.pdf',
      'report-page-2.pdf',
      'report-page-3.pdf',
      'report-page-4.pdf',
      'report-page-5.pdf',
      'report-page-6.pdf',
    ]);
  });

  it('shows real progress while running', async () => {
    const { user, rerender } = await setup();
    await user.type(input(), '1');
    await user.click(screen.getByRole('button', { name: 'Extract 1 page' }));
    state.job = { status: 'running', stage: 'working', progress: 0.5 };
    rerender(ui());
    const bar = await screen.findByRole('progressbar', { name: 'Pulling out your pages' });
    expect(bar).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getAllByText('Slicing out the pages').length).toBeGreaterThan(0);
  });

  it('offers a zip when several PDFs come out', async () => {
    const { user, rerender } = await setup();
    state.job = {
      status: 'done',
      blob: new Blob(['zip']),
      name: 'report-split.zip',
      files: 2,
      pages: 3,
    };
    rerender(ui());
    const heading = await screen.findByRole('heading', { name: 'Your PDFs are ready' });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.getByRole('link', { name: 'Download zip' })).toHaveAttribute(
      'download',
      'report-split.zip',
    );
    expect(screen.getByText(/2 PDFs in one zip, 3 pages in all/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Pick other pages' }));
    expect(state.reset).toHaveBeenCalled();
  });

  it('can retry after a failure with the same pages', async () => {
    const { user, file, rerender } = await setup();
    await user.type(input(), '2');
    await user.click(screen.getByRole('button', { name: 'Extract 1 page' }));
    state.job = { status: 'error', message: 'report.pdf could not be read.' };
    rerender(ui());
    expect(await screen.findByRole('alert')).toHaveTextContent('report.pdf could not be read.');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(state.start).toHaveBeenLastCalledWith({
      file,
      files: [{ name: 'report-page-2.pdf', pages: [2], label: 'page 2' }],
      zipName: 'report-extract.zip',
    });
  });
});
