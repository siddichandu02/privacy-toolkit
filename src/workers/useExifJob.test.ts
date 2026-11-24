import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PreparedFiles } from '../lib/image/heic';
import type { ExifReply } from './exif-protocol';
import { useExifJob } from './useExifJob';

class FakeWorker {
  onmessage: ((e: MessageEvent<ExifReply>) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  posted: unknown[] = [];
  terminate = vi.fn();
  postMessage(msg: unknown) {
    this.posted.push(msg);
  }
  reply(msg: ExifReply) {
    this.onmessage?.({ data: msg } as MessageEvent<ExifReply>);
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

const jpg = new File(['x'], 'beach.jpg', { type: 'image/jpeg' });
const heic = new File(['heic'], 'IMG_1.HEIC', { type: '' });

describe('useExifJob', () => {
  it('sends photos to the worker and ends with a blob', async () => {
    const { workers, make } = factory();
    const hook = renderHook(() => useExifJob(make, false, vi.fn()));
    await act(() => hook.result.current.start([jpg]));
    expect(workers[0]?.posted).toEqual([{ files: [jpg], settings: null }]);
    act(() =>
      workers[0]?.reply({
        type: 'done',
        bytes: new Uint8Array([1, 2]),
        name: 'beach.jpg',
        mime: 'image/jpeg',
        items: [{ name: 'beach.jpg', before: 9, after: 2, method: 'lossless' }],
        skipped: [],
      }),
    );
    const job = hook.result.current.job;
    expect(job.status).toBe('done');
    if (job.status === 'done') {
      expect(job.blob.type).toBe('image/jpeg');
      expect(job.items[0]?.method).toBe('lossless');
    }
  });

  it('decodes HEIC on the page before the worker starts', async () => {
    const { workers, make } = factory();
    const decoded = new File(['png'], 'IMG_1.HEIC', { type: 'image/png' });
    const prepare = vi.fn(async (): Promise<PreparedFiles> => ({
      files: [decoded],
      sizes: [4],
      undecoded: [],
    }));
    const hook = renderHook(() => useExifJob(make, false, prepare));
    await act(() => hook.result.current.start([heic]));
    expect(prepare).toHaveBeenCalledOnce();
    expect(workers[0]?.posted).toEqual([
      { files: [decoded], settings: null, sizes: [4], undecoded: [] },
    ]);
  });

  it('keeps the same start function between renders', () => {
    const { make } = factory();
    const prepare = vi.fn();
    const hook = renderHook(() => useExifJob(make, false, prepare));
    const first = hook.result.current.start;
    hook.rerender();
    expect(hook.result.current.start).toBe(first);
  });
});
