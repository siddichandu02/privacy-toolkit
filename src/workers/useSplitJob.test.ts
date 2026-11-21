import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SplitReply } from './split-protocol';
import { useSplitJob } from './useSplitJob';

class FakeWorker {
  onmessage: ((e: MessageEvent<SplitReply>) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  posted: unknown[] = [];
  terminate = vi.fn();
  postMessage(msg: unknown) {
    this.posted.push(msg);
  }
  reply(msg: SplitReply) {
    this.onmessage?.({ data: msg } as MessageEvent<SplitReply>);
  }
}

function setup() {
  const workers: FakeWorker[] = [];
  const hook = renderHook(() =>
    useSplitJob(() => {
      const w = new FakeWorker();
      workers.push(w);
      return w as unknown as Worker;
    }),
  );
  return { hook, workers };
}

const file = new File(['x'], 'a.pdf', { type: 'application/pdf' });
const request = { file, ranges: [{ from: 1, to: 2 }], mode: 'extract' as const };

describe('useSplitJob', () => {
  it('sends the request and ends with a typed blob', () => {
    const { hook, workers } = setup();
    act(() => hook.result.current.start(request));
    expect(workers[0]?.posted).toEqual([request]);
    expect(hook.result.current.job).toEqual({ status: 'running', stage: 'reading', progress: 0 });

    act(() => workers[0]?.reply({ type: 'progress', stage: 'packing', progress: 0.25 }));
    expect(hook.result.current.job).toMatchObject({ stage: 'packing', progress: 0.25 });

    act(() =>
      workers[0]?.reply({
        type: 'done',
        bytes: new Uint8Array([1, 2]),
        name: 'a-split.zip',
        mime: 'application/zip',
        files: 2,
        pages: 3,
      }),
    );
    const job = hook.result.current.job;
    expect(job.status).toBe('done');
    if (job.status === 'done') {
      expect(job).toMatchObject({ name: 'a-split.zip', files: 2, pages: 3 });
      expect(job.blob.type).toBe('application/zip');
    }
    expect(workers[0]?.terminate).toHaveBeenCalled();
  });

  it('keeps the blob type the worker chose', () => {
    const { hook, workers } = setup();
    act(() => hook.result.current.start(request));
    act(() =>
      workers[0]?.reply({
        type: 'done',
        bytes: new Uint8Array([1]),
        name: 'a-page-1.pdf',
        mime: 'application/pdf',
        files: 1,
        pages: 1,
      }),
    );
    const job = hook.result.current.job;
    expect(job.status === 'done' && job.blob.type).toBe('application/pdf');
  });

  it('reports a crash in plain words', async () => {
    const { hook, workers } = setup();
    act(() => hook.result.current.start(request));
    act(() => workers[0]?.onerror?.({ preventDefault() {} } as ErrorEvent));
    await waitFor(() =>
      expect(hook.result.current.job).toEqual({
        status: 'error',
        message: 'Something went wrong while splitting. Try again.',
      }),
    );
  });
});
