import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionConfig } from 'framer-motion';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTool, type ToolInfo } from '../../tools';
import type { RotateJob } from '../../workers/useRotateJob';
import { RotateTool } from './RotateTool';

vi.mock('../drop/preview', () => ({
  isPdf: (f: File) => f.name.endsWith('.pdf'),
  makePreview: vi.fn(async () => ({ url: null, pages: 3 })),
  openPdfPages: vi.fn(async () => ({
    count: 3,
    render: vi.fn(async () => null),
    close: vi.fn(),
  })),
}));

const state = vi.hoisted(() => ({
  job: { status: 'idle' } as RotateJob,
  start: vi.fn(),
  reset: vi.fn(),
}));
vi.mock('../../workers/useRotateJob', () => ({
  useRotateJob: () => ({ job: state.job, start: state.start, reset: state.reset }),
}));

const tool = getTool('rotate') as ToolInfo;
const ui = () => (
  <MotionConfig reducedMotion="always">
    <RotateTool tool={tool} />
  </MotionConfig>
);

async function setup() {
  const user = userEvent.setup();
  const view = render(ui());
  const file = new File([new Uint8Array(64)], 'scan.pdf', { type: 'application/pdf' });
  await user.upload(screen.getByTestId('file-input'), [file]);
  await screen.findAllByTestId('turn-tile');
  return { user, file, ...view };
}

const tiles = () => screen.getAllByTestId('turn-tile');
const save = () => screen.getByRole('button', { name: 'Save PDF' });

beforeEach(() => {
  state.job = { status: 'idle' };
  state.start.mockReset();
  state.reset.mockReset();
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:rotate');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});

describe('RotateTool', () => {
  it('waits for a change before saving', async () => {
    await setup();
    expect(tiles()).toHaveLength(3);
    expect(screen.getByText('Turn or remove a page to begin.')).toBeVisible();
    expect(save()).toBeDisabled();
  });

  it('turns pages with buttons and keys, and says so', async () => {
    const { user } = await setup();
    await user.click(screen.getByRole('button', { name: 'Turn page 1 right' }));
    expect(tiles()[0]).toHaveAttribute('data-angle', '90');
    expect(screen.getByText('Page 1 turned to 90 degrees.')).toBeInTheDocument();

    tiles()[1]?.focus();
    await user.keyboard('r');
    await user.keyboard('{Shift>}R{/Shift}');
    expect(tiles()[1]).toHaveAttribute('data-angle', '0');
    expect(screen.getByText('Page 2 is upright.')).toBeInTheDocument();
    expect(screen.getByText('1 page turned of 3.')).toBeVisible();
  });

  it('removes pages and will not save an empty PDF', async () => {
    const { user } = await setup();
    for (const n of [1, 2, 3]) {
      await user.click(screen.getByRole('button', { name: `Remove page ${n}` }));
    }
    expect(screen.getByText('Keep at least one page. A PDF cannot be empty.')).toBeVisible();
    expect(save()).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Keep page 2' }));
    expect(save()).toBeEnabled();
  });

  it('turns every kept page at once and undoes it all', async () => {
    const { user } = await setup();
    await user.click(screen.getByRole('button', { name: 'Remove page 3' }));
    await user.click(screen.getByRole('button', { name: /All left/ }));
    expect(tiles().map((t) => t.getAttribute('data-angle'))).toEqual(['270', '270', '0']);
    await user.click(screen.getByRole('button', { name: /Undo all/ }));
    expect(tiles().every((t) => t.getAttribute('data-removed') === 'false')).toBe(true);
    expect(save()).toBeDisabled();
  });

  it('sends one edit per page to the worker', async () => {
    const { user, file } = await setup();
    await user.click(screen.getByRole('button', { name: 'Turn page 2 left' }));
    await user.click(screen.getByRole('button', { name: 'Remove page 3' }));
    await user.click(save());
    expect(state.start).toHaveBeenCalledWith({
      file,
      edits: [
        { turns: 0, keep: true },
        { turns: -1, keep: true },
        { turns: 0, keep: false },
      ],
    });
  });

  it('shows what changed on the done card', () => {
    state.job = {
      status: 'done',
      blob: new Blob([new Uint8Array(2048)], { type: 'application/pdf' }),
      name: 'scan-rotated.pdf',
      pages: 2,
      rotated: 1,
      removed: 1,
    };
    render(ui());
    expect(screen.getByText('2 pages, 1 turned, 1 removed, 2 KB.', { exact: false })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Keep editing' })).toBeVisible();
  });
});
