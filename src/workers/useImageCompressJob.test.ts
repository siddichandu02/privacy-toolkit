import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImageCompressReply, ImagePreviewReply } from './image-compress-protocol';
import { useImageCompressJob } from './useImageCompressJob';
import { PREVIEW_DEBOUNCE_MS, useImagePreview } from './useImagePreview';

type Reply = ImageCompressReply | ImagePreviewReply;

class FakeWorker {
  onmessage: ((e: MessageEvent<Reply>) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  posted: unknown[] = [];
  terminate = vi.fn();
  postMessage(msg: unknown) {
    this.posted.push(msg);
  }
  reply(msg: Reply) {
    this.onmessage?.({ data: msg } as MessageEvent<Reply>);
  }
}

const photo = new File(['x'], 'cat.jpg', { type: 'image/jpeg' });
const settings = { quality: 0.75, format: 'same' as const, maxEdge: null };

function factory() {
  const workers: FakeWorker[] = [];
  const make = () => {
    const w = new FakeWorker();
    workers.push(w);
    return w as unknown as Worker;
  };
  return { workers, make };
}

describe('useImageCompressJob', () => {
  it('sends the files and settings and ends with a blob of the right type', () => {
    const { workers, make } = factory();
    const hook = renderHook(() => useImageCompressJob(make));
    act(() => void hook.result.current.start([photo], settings));
    expect(workers[0]?.posted).toEqual([{ files: [photo], settings }]);

    act(() =>
      workers[0]?.reply({
        type: 'done',
        bytes: new Uint8Array([1, 2]),
        name: 'cat-compressed.jpg',
        mime: 'image/jpeg',
        items: [
          { name: 'cat-compressed.jpg', type: 'image/jpeg', before: 9, after: 2, kept: false },
        ],
        skipped: [],
        before: 9,
        after: 2,
      }),
    );
    const job = hook.result.current.job;
    expect(job).toMatchObject({ status: 'done', name: 'cat-compressed.jpg', after: 2 });
    expect(job.status === 'done' && job.blob.type).toBe('image/jpeg');
  });
});

describe('useImagePreview', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:${Math.random()}`);
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const encoded = (id: number, size: number): ImagePreviewReply => ({
    type: 'preview',
    id,
    bytes: new Uint8Array(size),
    mime: 'image/jpeg',
    width: 40,
    height: 30,
    sourceWidth: 40,
    sourceHeight: 30,
  });

  it('waits for the settings to settle and keeps only the latest answer', () => {
    const { workers, make } = factory();
    const hook = renderHook(({ s }) => useImagePreview(photo, s, make), {
      initialProps: { s: settings },
    });
    expect(hook.result.current.busy).toBe(true);
    expect(workers).toHaveLength(0);

    act(() => vi.advanceTimersByTime(PREVIEW_DEBOUNCE_MS));
    expect(workers[0]?.posted).toEqual([
      { kind: 'preview', id: 1, file: photo, settings, sourceType: 'image/jpeg' },
    ]);

    // A quick change replaces the request; the first answer arrives late and is ignored.
    hook.rerender({ s: { ...settings, quality: 0.4 } });
    act(() => vi.advanceTimersByTime(PREVIEW_DEBOUNCE_MS));
    act(() => workers[0]?.reply(encoded(1, 500)));
    expect(hook.result.current.preview).toBeNull();

    act(() => workers[0]?.reply(encoded(2, 200)));
    expect(hook.result.current).toMatchObject({
      busy: false,
      failed: false,
      preview: { bytes: 200, width: 40, type: 'image/jpeg' },
    });
  });

  it('says when the photo cannot be opened, and stops the worker when it goes', () => {
    const { workers, make } = factory();
    const hook = renderHook(() => useImagePreview(photo, settings, make));
    act(() => vi.advanceTimersByTime(PREVIEW_DEBOUNCE_MS));
    act(() => workers[0]?.reply({ type: 'preview-error', id: 1 }));
    expect(hook.result.current.failed).toBe(true);
    hook.unmount();
    expect(workers[0]?.terminate).toHaveBeenCalled();
  });

  it('opens a HEIC photo on the page first and tells the worker what it was', async () => {
    const { workers, make } = factory();
    const heic = new File(['h'], 'IMG_1.HEIC');
    const decoded = new File(['p'], 'IMG_1.HEIC', { type: 'image/png' });
    const decode = vi.fn(() => Promise.resolve(decoded));
    renderHook(() => useImagePreview(heic, settings, make, decode));
    await act(async () => {
      vi.advanceTimersByTime(PREVIEW_DEBOUNCE_MS);
      await Promise.resolve();
    });
    expect(decode).toHaveBeenCalledWith(heic);
    expect(workers[0]?.posted).toEqual([
      { kind: 'preview', id: 1, file: decoded, settings, sourceType: 'image/heic' },
    ]);
  });

  it('says the HEIC photo cannot be shown when decoding fails', async () => {
    const { workers, make } = factory();
    const heic = new File(['h'], 'IMG_2.heic', { type: 'image/heic' });
    const decode = vi.fn(() => Promise.reject(new Error('bad')));
    const hook = renderHook(() => useImagePreview(heic, settings, make, decode));
    await act(async () => {
      vi.advanceTimersByTime(PREVIEW_DEBOUNCE_MS);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(workers[0]?.posted).toEqual([]);
    expect(hook.result.current).toMatchObject({ failed: true, busy: false });
  });
});

describe('useImageCompressJob with HEIC', () => {
  it('decodes HEIC photos first and passes the sizes as picked', async () => {
    const { workers, make } = factory();
    const heic = new File(['hhhh'], 'IMG_3.HEIC');
    const decoded = new File(['pp'], 'IMG_3.HEIC', { type: 'image/png' });
    const prepare = vi.fn(() =>
      Promise.resolve({ files: [photo, decoded], sizes: [1, 4], undecoded: [] }),
    );
    const hook = renderHook(() => useImageCompressJob(make, false, prepare));
    await act(async () => {
      await hook.result.current.start([photo, heic], settings);
    });
    expect(prepare).toHaveBeenCalledWith([photo, heic], expect.any(Function));
    expect(workers.at(-1)?.posted).toEqual([
      { files: [photo, decoded], settings, sizes: [1, 4], undecoded: [] },
    ]);
  });
});
