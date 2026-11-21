import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_OPTIONS } from '../lib/pdf/images';
import type { ImagesReply } from './images-protocol';
import { useImagesJob } from './useImagesJob';

class FakeWorker {
  onmessage: ((e: MessageEvent<ImagesReply>) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  posted: unknown[] = [];
  terminate = vi.fn();
  postMessage(msg: unknown) {
    this.posted.push(msg);
  }
  reply(msg: ImagesReply) {
    this.onmessage?.({ data: msg } as MessageEvent<ImagesReply>);
  }
}

function setup() {
  const workers: FakeWorker[] = [];
  const hook = renderHook(() =>
    useImagesJob(() => {
      const w = new FakeWorker();
      workers.push(w);
      return w as unknown as Worker;
    }),
  );
  return { hook, workers };
}

const files = [new File(['x'], 'beach.jpg', { type: 'image/jpeg' })];
const request = { files, options: DEFAULT_OPTIONS };

describe('useImagesJob', () => {
  it('sends the images and options and ends with a pdf blob', () => {
    const { hook, workers } = setup();
    act(() => hook.result.current.start(request));
    expect(workers[0]?.posted).toEqual([request]);
    expect(hook.result.current.job).toMatchObject({ status: 'running', stage: 'reading' });

    act(() => workers[0]?.reply({ type: 'progress', stage: 'working', progress: 0.25 }));
    expect(hook.result.current.job).toMatchObject({ stage: 'working', progress: 0.25 });

    act(() =>
      workers[0]?.reply({ type: 'done', bytes: new Uint8Array([1]), name: 'beach.pdf', pages: 1 }),
    );
    const job = hook.result.current.job;
    expect(job).toMatchObject({ status: 'done', name: 'beach.pdf', pages: 1 });
    expect(job.status === 'done' && job.blob.type).toBe('application/pdf');
    expect(workers[0]?.terminate).toHaveBeenCalled();
  });

  it('passes the broken file name through', () => {
    const { hook, workers } = setup();
    act(() => hook.result.current.start(request));
    act(() =>
      workers[0]?.reply({
        type: 'error',
        message: 'beach.jpg could not be read.',
        fileName: 'beach.jpg',
      }),
    );
    expect(hook.result.current.job).toEqual({
      status: 'error',
      message: 'beach.jpg could not be read.',
      fileName: 'beach.jpg',
    });
  });

  it('reports a crash in plain words', async () => {
    const { hook, workers } = setup();
    act(() => hook.result.current.start(request));
    act(() => workers[0]?.onerror?.({ preventDefault: () => {} } as ErrorEvent));
    await waitFor(() =>
      expect(hook.result.current.job).toEqual({
        status: 'error',
        message: 'Something went wrong while making your PDF. Try again.',
      }),
    );
  });
});
