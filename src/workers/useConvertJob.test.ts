import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PreparedFiles } from '../lib/image/heic';
import type { ConvertReply } from './convert-protocol';
import { useConvertJob } from './useConvertJob';

class FakeWorker {
  onmessage: ((e: MessageEvent<ConvertReply>) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  posted: unknown[] = [];
  terminate = vi.fn();
  postMessage(msg: unknown) {
    this.posted.push(msg);
  }
  reply(msg: ConvertReply) {
    this.onmessage?.({ data: msg } as MessageEvent<ConvertReply>);
  }
}

function factory() {
  const workers: FakeWorker[] = [];
  const make = () => {
    const w = new FakeWorker();
    workers.push(w);
    return w as unknown as Worker;
  };
  return { workers, make };
}

const settings = { to: 'jpeg' as const, quality: 0.9 };
const png = new File(['x'], 'logo.png', { type: 'image/png' });
const heic = new File(['heic'], 'IMG_1.HEIC', { type: '' });

describe('useConvertJob', () => {
  it('sends ordinary photos straight to the worker and ends with a blob', async () => {
    const { workers, make } = factory();
    const prepare = vi.fn();
    const hook = renderHook(() => useConvertJob(make, false, prepare));
    await act(() => hook.result.current.start([png], settings));
    expect(prepare).not.toHaveBeenCalled();
    expect(workers[0]?.posted).toEqual([{ files: [png], settings }]);
    expect(hook.result.current.job).toMatchObject({ status: 'running', stage: 'reading' });

    act(() =>
      workers[0]?.reply({
        type: 'done',
        bytes: new Uint8Array([1]),
        name: 'logo.jpg',
        mime: 'image/jpeg',
        items: [{ name: 'logo.jpg', from: 'image/png', type: 'image/jpeg', before: 1, after: 1 }],
        skipped: [],
        fellBack: false,
      }),
    );
    const job = hook.result.current.job;
    expect(job.status).toBe('done');
    if (job.status === 'done') {
      expect(job.blob.type).toBe('image/jpeg');
      expect(job.name).toBe('logo.jpg');
    }
  });

  it('decodes HEIC first, showing it as reading, and keeps the first start time', async () => {
    const { workers, make } = factory();
    let release: (v: PreparedFiles) => void = () => {};
    let report: (share: number) => void = () => {};
    const decodedFile = new File(['png'], 'IMG_1.HEIC', { type: 'image/png' });
    const prepare = vi.fn(
      (_files: readonly File[], onProgress?: (share: number) => void) =>
        new Promise<PreparedFiles>((resolve) => {
          release = resolve;
          report = onProgress ?? (() => {});
        }),
    );
    const hook = renderHook(() => useConvertJob(make, false, prepare));
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = hook.result.current.start([heic, png], settings);
    });
    expect(workers).toHaveLength(0);
    expect(hook.result.current.job).toEqual({ status: 'running', stage: 'reading', progress: 0 });
    const first = hook.result.current.clock?.startedAt;
    expect(first).toBeTypeOf('number');

    act(() => report(0.5));
    expect(hook.result.current.job).toMatchObject({ progress: 0.45 });

    await act(async () => {
      release({ files: [decodedFile, png], sizes: [4, 1], undecoded: [] });
      await pending;
    });
    expect(workers[0]?.posted).toEqual([
      { files: [decodedFile, png], settings, sizes: [4, 1], undecoded: [] },
    ]);
    expect(hook.result.current.clock?.startedAt).toBe(first);
    // The worker's own early reading does not move the bar back.
    act(() => workers[0]?.reply({ type: 'progress', stage: 'reading', progress: 0.05 }));
    expect(hook.result.current.job).toMatchObject({ stage: 'reading', progress: 0.9 });
  });

  it('drops a decode that finishes after a reset', async () => {
    const { workers, make } = factory();
    let release: (v: PreparedFiles) => void = () => {};
    const prepare = vi.fn(
      () =>
        new Promise<PreparedFiles>((resolve) => {
          release = resolve;
        }),
    );
    const hook = renderHook(() => useConvertJob(make, false, prepare));
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = hook.result.current.start([heic], settings);
    });
    act(() => hook.result.current.reset());
    expect(hook.result.current.job).toEqual({ status: 'idle' });
    await act(async () => {
      release({ files: [heic], sizes: [4], undecoded: [0] });
      await pending;
    });
    expect(workers).toHaveLength(0);
    expect(hook.result.current.job).toEqual({ status: 'idle' });
  });
});
