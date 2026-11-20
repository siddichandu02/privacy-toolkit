import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CompressReply } from './compress-protocol';
import { useCompressJob } from './useCompressJob';

class FakeWorker {
  onmessage: ((e: MessageEvent<CompressReply>) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  posted: unknown[] = [];
  terminate = vi.fn();
  postMessage(msg: unknown) {
    this.posted.push(msg);
  }
  reply(msg: CompressReply) {
    this.onmessage?.({ data: msg } as MessageEvent<CompressReply>);
  }
}

function setup() {
  const workers: FakeWorker[] = [];
  const hook = renderHook(() =>
    useCompressJob(() => {
      const w = new FakeWorker();
      workers.push(w);
      return w as unknown as Worker;
    }),
  );
  return { hook, workers };
}

const file = new File(['x'], 'scan.pdf', { type: 'application/pdf' });
const request = { file, level: 'balanced' as const };

describe('useCompressJob', () => {
  it('sends the level and ends with a pdf blob', () => {
    const { hook, workers } = setup();
    act(() => hook.result.current.start(request));
    expect(workers[0]?.posted).toEqual([request]);

    act(() => workers[0]?.reply({ type: 'progress', stage: 'working', progress: 0.5 }));
    expect(hook.result.current.job).toMatchObject({ stage: 'working', progress: 0.5 });

    act(() =>
      workers[0]?.reply({
        type: 'done',
        bytes: new Uint8Array([1]),
        name: 'scan-compressed.pdf',
        before: 900,
        after: 300,
        images: 2,
        shrunk: 2,
        smaller: true,
      }),
    );
    const job = hook.result.current.job;
    expect(job).toMatchObject({ status: 'done', name: 'scan-compressed.pdf', after: 300 });
    expect(job.status === 'done' && job.blob.type).toBe('application/pdf');
    expect(workers[0]?.terminate).toHaveBeenCalled();
  });

  it('passes worker errors through', () => {
    const { hook, workers } = setup();
    act(() => hook.result.current.start(request));
    act(() =>
      workers[0]?.reply({
        type: 'error',
        message: 'scan.pdf is password protected.',
        fileName: 'scan.pdf',
      }),
    );
    expect(hook.result.current.job).toEqual({
      status: 'error',
      message: 'scan.pdf is password protected.',
      fileName: 'scan.pdf',
    });
  });
});
