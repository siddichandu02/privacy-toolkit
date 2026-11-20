import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SignReply } from './sign-protocol';
import { useSignJob } from './useSignJob';

class FakeWorker {
  onmessage: ((e: MessageEvent<SignReply>) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  posted: unknown[] = [];
  terminate = vi.fn();
  postMessage(msg: unknown) {
    this.posted.push(msg);
  }
  reply(msg: SignReply) {
    this.onmessage?.({ data: msg } as MessageEvent<SignReply>);
  }
}

function setup() {
  const workers: FakeWorker[] = [];
  const hook = renderHook(() =>
    useSignJob(() => {
      const w = new FakeWorker();
      workers.push(w);
      return w as unknown as Worker;
    }),
  );
  return { hook, workers };
}

const request = {
  file: new File(['x'], 'lease.pdf', { type: 'application/pdf' }),
  signature: new Blob(['png'], { type: 'image/png' }),
  aspect: 0.4,
  place: { x: 0.5, y: 0.8, w: 0.3 },
  pages: [0],
};

describe('useSignJob', () => {
  it('sends the signature and ends with a pdf blob', () => {
    const { hook, workers } = setup();
    act(() => hook.result.current.start(request));
    expect(workers[0]?.posted).toEqual([request]);
    expect(hook.result.current.job).toMatchObject({ status: 'running', stage: 'reading' });

    act(() =>
      workers[0]?.reply({
        type: 'done',
        bytes: new Uint8Array([1]),
        name: 'lease-signed.pdf',
        pages: 2,
        signed: 1,
      }),
    );
    const job = hook.result.current.job;
    expect(job).toMatchObject({ status: 'done', name: 'lease-signed.pdf', signed: 1 });
    expect(job.status === 'done' && job.blob.type).toBe('application/pdf');
    expect(workers[0]?.terminate).toHaveBeenCalled();
  });

  it('passes worker errors through', () => {
    const { hook, workers } = setup();
    act(() => hook.result.current.start(request));
    act(() =>
      workers[0]?.reply({ type: 'error', message: 'Pick a page to sign.', fileName: 'lease.pdf' }),
    );
    expect(hook.result.current.job).toEqual({
      status: 'error',
      message: 'Pick a page to sign.',
      fileName: 'lease.pdf',
    });
  });
});
