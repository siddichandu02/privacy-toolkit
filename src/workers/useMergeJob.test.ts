import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MergeReply } from './merge-protocol';
import { useMergeJob } from './useMergeJob';

class FakeWorker {
  onmessage: ((e: MessageEvent<MergeReply>) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  posted: unknown[] = [];
  terminate = vi.fn();
  postMessage(msg: unknown) {
    this.posted.push(msg);
  }
  reply(msg: MergeReply) {
    this.onmessage?.({ data: msg } as MessageEvent<MergeReply>);
  }
}

function setup() {
  const workers: FakeWorker[] = [];
  const factory = () => {
    const w = new FakeWorker();
    workers.push(w);
    return w as unknown as Worker;
  };
  const hook = renderHook(() => useMergeJob(factory));
  return { hook, workers };
}

const file = new File(['x'], 'a.pdf', { type: 'application/pdf' });

describe('useMergeJob', () => {
  it('follows worker progress and finishes with a pdf blob', () => {
    const { hook, workers } = setup();
    act(() => hook.result.current.start([file]));
    expect(workers[0]?.posted).toEqual([{ files: [file] }]);
    expect(hook.result.current.job).toEqual({ status: 'running', stage: 'reading', progress: 0 });

    act(() => workers[0]?.reply({ type: 'progress', stage: 'working', progress: 0.5 }));
    expect(hook.result.current.job).toMatchObject({ stage: 'working', progress: 0.5 });

    act(() => workers[0]?.reply({ type: 'done', bytes: new Uint8Array([1, 2, 3]) }));
    const job = hook.result.current.job;
    expect(job.status).toBe('done');
    if (job.status === 'done') {
      expect(job.size).toBe(3);
      expect(job.blob.type).toBe('application/pdf');
    }
    expect(workers[0]?.terminate).toHaveBeenCalled();
  });

  it('passes worker errors through', () => {
    const { hook, workers } = setup();
    act(() => hook.result.current.start([file]));
    act(() =>
      workers[0]?.reply({ type: 'error', message: 'b.pdf could not be read.', fileName: 'b.pdf' }),
    );
    expect(hook.result.current.job).toEqual({
      status: 'error',
      message: 'b.pdf could not be read.',
      fileName: 'b.pdf',
    });
  });

  it('ignores a stale worker after reset', () => {
    const { hook, workers } = setup();
    act(() => hook.result.current.start([file]));
    act(() => hook.result.current.reset());
    act(() => workers[0]?.reply({ type: 'progress', stage: 'packing', progress: 1 }));
    expect(hook.result.current.job).toEqual({ status: 'idle' });
    expect(workers[0]?.terminate).toHaveBeenCalled();
  });

  it('closes the worker on unmount', () => {
    const { hook, workers } = setup();
    act(() => hook.result.current.start([file]));
    hook.unmount();
    expect(workers[0]?.terminate).toHaveBeenCalled();
  });
});
