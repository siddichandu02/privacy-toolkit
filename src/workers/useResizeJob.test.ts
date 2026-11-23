import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ResizeReply, ResizeWorkerRequest } from './resize-protocol';
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

function setup() {
  const workers: FakeWorker[] = [];
  const hook = renderHook(() =>
    useResizeJob(() => {
      const w = new FakeWorker();
      workers.push(w);
      return w as unknown as Worker;
    }),
  );
  return { hook, workers };
}

const request: ResizeWorkerRequest = {
  file: new File(['x'], 'beach.jpg', { type: 'image/jpeg' }),
  settings: { width: 400, height: 400, crop: null, type: 'image/jpeg', quality: 0.92 },
};

describe('useResizeJob', () => {
  it('sends the photo and settings and ends with a blob of the new type', () => {
    const { hook, workers } = setup();
    act(() => hook.result.current.start(request));
    expect(workers[0]?.posted).toEqual([request]);

    act(() => workers[0]?.reply({ type: 'progress', stage: 'working', progress: 0.3 }));
    expect(hook.result.current.job).toMatchObject({ stage: 'working', progress: 0.3 });

    act(() =>
      workers[0]?.reply({
        type: 'done',
        bytes: new Uint8Array([1, 2]),
        name: 'beach-400x400.jpg',
        mime: 'image/jpeg',
        width: 400,
        height: 400,
        sourceWidth: 1200,
        sourceHeight: 900,
        before: 1,
        after: 2,
      }),
    );
    const job = hook.result.current.job;
    expect(job).toMatchObject({ status: 'done', name: 'beach-400x400.jpg', width: 400 });
    expect(job.status === 'done' && job.blob.type).toBe('image/jpeg');
  });

  it('reports a crash in plain words', async () => {
    const { hook, workers } = setup();
    act(() => hook.result.current.start(request));
    act(() => workers[0]?.onerror?.({ preventDefault: () => {} } as ErrorEvent));
    await waitFor(() =>
      expect(hook.result.current.job).toEqual({
        status: 'error',
        message: 'Something went wrong while resizing your photo. Try again.',
      }),
    );
  });
});
