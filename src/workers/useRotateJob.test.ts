import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RotateReply } from './rotate-protocol';
import { useRotateJob } from './useRotateJob';

class FakeWorker {
  onmessage: ((e: MessageEvent<RotateReply>) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  posted: unknown[] = [];
  terminate = vi.fn();
  postMessage(msg: unknown) {
    this.posted.push(msg);
  }
  reply(msg: RotateReply) {
    this.onmessage?.({ data: msg } as MessageEvent<RotateReply>);
  }
}

function setup() {
  const workers: FakeWorker[] = [];
  const hook = renderHook(() =>
    useRotateJob(() => {
      const w = new FakeWorker();
      workers.push(w);
      return w as unknown as Worker;
    }),
  );
  return { hook, workers };
}

const file = new File(['x'], 'scan.pdf', { type: 'application/pdf' });
const request = { file, edits: [{ turns: 1, keep: true }] };

describe('useRotateJob', () => {
  it('sends the edits and ends with a pdf blob', () => {
    const { hook, workers } = setup();
    act(() => hook.result.current.start(request));
    expect(workers[0]?.posted).toEqual([request]);

    act(() => workers[0]?.reply({ type: 'progress', stage: 'working', progress: 0.5 }));
    expect(hook.result.current.job).toMatchObject({ stage: 'working', progress: 0.5 });

    act(() =>
      workers[0]?.reply({
        type: 'done',
        bytes: new Uint8Array([1]),
        name: 'scan-rotated.pdf',
        pages: 1,
        rotated: 1,
        removed: 0,
      }),
    );
    const job = hook.result.current.job;
    expect(job).toMatchObject({ status: 'done', name: 'scan-rotated.pdf', rotated: 1 });
    expect(job.status === 'done' && job.blob.type).toBe('application/pdf');
    expect(workers[0]?.terminate).toHaveBeenCalled();
  });

  it('passes worker errors through', () => {
    const { hook, workers } = setup();
    act(() => hook.result.current.start(request));
    act(() =>
      workers[0]?.reply({
        type: 'error',
        message: 'Keep at least one page.',
        fileName: 'scan.pdf',
      }),
    );
    expect(hook.result.current.job).toEqual({
      status: 'error',
      message: 'Keep at least one page.',
      fileName: 'scan.pdf',
    });
  });
});
