import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionConfig } from 'framer-motion';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTool, type ToolInfo } from '../../tools';
import type { SignJob } from '../../workers/useSignJob';
import { SignTool } from './SignTool';

vi.mock('../drop/preview', () => ({
  isPdf: (f: File) => f.name.endsWith('.pdf'),
  makePreview: vi.fn(async () => ({ url: null, pages: 3 })),
  openPdfPages: vi.fn(async () => ({
    count: 3,
    render: vi.fn(async () => null),
    close: vi.fn(),
  })),
}));

const sig = vi.hoisted(() => ({ blob: new Blob(['png'], { type: 'image/png' }), aspect: 0.25 }));
vi.mock('./ink', async (actual) => ({
  ...(await actual<typeof import('./ink')>()),
  signatureFromText: vi.fn(async (text: string) => (text.trim() ? sig : null)),
  signatureFromStrokes: vi.fn(async () => null),
}));

const state = vi.hoisted(() => ({
  job: { status: 'idle' } as SignJob,
  start: vi.fn(),
  reset: vi.fn(),
}));
vi.mock('../../workers/useSignJob', () => ({
  useSignJob: () => ({ job: state.job, start: state.start, reset: state.reset }),
}));

const tool = getTool('sign') as ToolInfo;
const ui = () => (
  <MotionConfig reducedMotion="always">
    <SignTool tool={tool} />
  </MotionConfig>
);

async function setup() {
  const user = userEvent.setup();
  const view = render(ui());
  const file = new File([new Uint8Array(64)], 'lease.pdf', { type: 'application/pdf' });
  await user.upload(screen.getByTestId('file-input'), [file]);
  await screen.findByText('Page 1 of 3');
  return { user, file, ...view };
}

const signButton = () => screen.getByRole('button', { name: 'Sign PDF' });

async function typeName(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('radio', { name: 'Type' }));
  await user.type(screen.getByLabelText('Your name'), 'Alex Morgan');
  return screen.findByTestId('signature-box', undefined, { timeout: 2000 });
}

beforeEach(() => {
  state.job = { status: 'idle' };
  state.start.mockReset();
  state.reset.mockReset();
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:sign');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});

describe('SignTool', () => {
  it('waits for a signature before signing', async () => {
    await setup();
    expect(screen.getByText('Draw or type your signature to begin.')).toBeVisible();
    expect(signButton()).toBeDisabled();
    expect(screen.getByText('Your signature lands here')).toBeVisible();
  });

  it('signs the page shown where the signature was placed', async () => {
    const { user, file } = await setup();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    const box = await typeName(user);
    expect(screen.getByText('Signs page 2. lease.pdf stays as it is.')).toBeVisible();

    box.focus();
    const x = Number(box.dataset.x);
    await user.keyboard('{Shift>}{ArrowLeft}{/Shift}');
    expect(Number(box.dataset.x)).toBeCloseTo(x - 0.05);
    const w = Number(box.dataset.w);
    await user.keyboard('-');
    expect(Number(box.dataset.w)).toBeCloseTo(w - 0.01);

    await user.click(signButton());
    expect(state.start).toHaveBeenCalledWith({
      file,
      signature: sig.blob,
      aspect: 0.25,
      place: { x: Number(box.dataset.x), y: Number(box.dataset.y), w: Number(box.dataset.w) },
      pages: [1],
    });
  });

  it('can sign every page', async () => {
    const { user } = await setup();
    await typeName(user);
    await user.click(screen.getByRole('radio', { name: 'Every page' }));
    expect(screen.getByText('Signs all 3 pages in the same spot.', { exact: false })).toBeVisible();
    await user.click(signButton());
    expect(state.start.mock.calls[0]?.[0].pages).toEqual([0, 1, 2]);
  });

  it('shows the signing steps while it works', () => {
    state.job = { status: 'running', stage: 'working', progress: 0.5 };
    render(ui());
    expect(screen.getByTestId('step-announcer')).toHaveTextContent('Signing the pages');
  });

  it('says where it signed on the done card', () => {
    state.job = {
      status: 'done',
      blob: new Blob([new Uint8Array(2048)], { type: 'application/pdf' }),
      name: 'lease-signed.pdf',
      pages: 3,
      signed: 3,
    };
    render(ui());
    expect(screen.getByText('Signed on all 3 pages, 2 KB.', { exact: false })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Move the signature' })).toBeVisible();
  });
});
