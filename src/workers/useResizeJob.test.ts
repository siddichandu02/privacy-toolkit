import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ResizeSettings } from '../lib/image/resize';
import type { ResizeReply } from './resize-protocol';
import { useResizeJob } from './useResizeJob';

class FakeWorker {
  onmessage: ((e: MessageEvent<ResizeReply>) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  posted: unknown[] = [];
  terminate = vi.fn();
  postMessage(msg: unknown) {
    this.posted.push(msg);
  }
  reply(msg: ResizeReply) {
    this.onmessage?.({ data: msg } as MessageEvent<ResizeReply>);
  }
}

function setup(prepare = vi.fn()) {
  const workers: FakeWorker[] = [];
  const hook = renderHook(() =>
    useResizeJob(
      () => {
        const w = new FakeWorker();
        workers.push(w);
        return w as unknown as Worker;
      },
      false,
      prepare,
    ),
  );
  return { hook, workers, prepare };
}

const settings: ResizeSettings = {
  width: 400,
  height: 400,
  cut: true,
  views: [{ x: 0.3, y: 0.5, zoom: 1.5 }, null],
  quality: 0.92,
};
const a = new File(['x'], 'beach.jpg', { type: 'image/jpeg' });
const b = new File(['y'], 'dog.png', { type: 'image/png' });

describe('useResizeJob', () => {
  it('sends every photo with its framing and ends with the ZIP', async () => {
    const { hook, workers, prepare } = setup();
    await act(() => hook.result.current.start([a, b], settings));
    expect(prepare).not.toHaveBeenCalled();
    expect(workers[0]?.posted).toEqual([{ files: [a, b], settings }]);

    act(() => workers[0]?.reply({ type: 'progress', stage: 'working', progress: 0.5 }));
    expect(hook.result.current.job).toMatchObject({ stage: 'working', progress: 0.5 });

    const item = {
      width: 400,
      height: 400,
      sourceWidth: 1200,
      sourceHeight: 900,
      before: 1,
      after: 2,
    };
    act(() =>
      workers[0]?.reply({
        type: 'done',
        bytes: new Uint8Array([1, 2]),
        name: 'resized-photos.zip',
        mime: 'application/zip',
        items: [
          { name: 'beach-400x400.jpg', ...item },
          { name: 'dog-400x400.png', ...item },
        ],
        skipped: [],
      }),
    );
    const job = hook.result.current.job;
    expect(job).toMatchObject({ status: 'done', name: 'resized-photos.zip' });
    expect(job.status === 'done' && job.items).toHaveLength(2);
    expect(job.status === 'done' && job.blob.type).toBe('application/zip');
  });

  it('opens HEIC photos on the page before the worker gets them', async () => {
    const heic = new File(['h'], 'IMG_1.HEIC', { type: '' });
    const png = new File(['p'], 'IMG_1.HEIC', { type: 'image/png' });
    const prepare = vi.fn(async () => ({ files: [png], sizes: [1], undecoded: [] }));
    const { hook, workers } = setup(prepare);
    await act(() => hook.result.current.start([heic], settings));
    expect(prepare).toHaveBeenCalledOnce();
    expect(workers[0]?.posted).toEqual([{ files: [png], settings, sizes: [1], undecoded: [] }]);
  });

  it('reports a crash in plain words', async () => {
    const { hook, workers } = setup();
    await act(() => hook.result.current.start([a], settings));
    act(() => workers[0]?.onerror?.({ preventDefault: () => {} } as ErrorEvent));
    await waitFor(() =>
      expect(hook.result.current.job).toEqual({
        status: 'error',
        message: 'Something went wrong while resizing your photos. Try again.',
      }),
    );
  });
});
