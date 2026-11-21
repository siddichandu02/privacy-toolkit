import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MEMORY_MESSAGE } from './fail';
import { UPDATED_MESSAGE, useWorkerJob, type WorkerReply } from './useWorkerJob';

const newer = vi.hoisted(() => ({ value: false, calls: 0 }));
vi.mock('./appVersion', () => ({
  hasNewerVersion: () => {
    newer.calls += 1;
    return Promise.resolve(newer.value);
  },
}));

type Reply = WorkerReply<'working', { n: number }>;

class FakeWorker {
  onmessage: ((e: MessageEvent<Reply>) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  terminate = vi.fn();
  postMessage = vi.fn();
  reply(msg: Reply) {
    this.onmessage?.({ data: msg } as MessageEvent<Reply>);
  }
  crash() {
    this.onerror?.({ preventDefault() {} } as ErrorEvent);
  }
}

const finish = ({ n }: { n: number }) => ({ n });

function setup() {
  const workers: FakeWorker[] = [];
  const createWorker = () => {
    const w = new FakeWorker();
    workers.push(w);
    return w as unknown as Worker;
  };
  const hook = renderHook(() =>
    useWorkerJob<string, 'working', { n: number }, { n: number }>({
      createWorker,
      firstStage: 'working',
      finish,
      crashMessage: 'It broke.',
    }),
  );
  return { hook, workers };
}

beforeEach(() => {
  newer.value = false;
  newer.calls = 0;
});

describe('useWorkerJob failures', () => {
  it('asks for a reload when the worker never starts after a deploy', async () => {
    newer.value = true;
    const { hook, workers } = setup();
    act(() => hook.result.current.start('go'));
    act(() => workers[0]?.crash());
    await waitFor(() =>
      expect(hook.result.current.job).toEqual({
        status: 'error',
        message: UPDATED_MESSAGE,
        reason: 'updated',
      }),
    );
    expect(workers[0]?.terminate).toHaveBeenCalled();
  });

  it('uses the tool message when the worker never starts for another reason', async () => {
    const { hook, workers } = setup();
    act(() => hook.result.current.start('go'));
    act(() => workers[0]?.crash());
    await waitFor(() =>
      expect(hook.result.current.job).toEqual({ status: 'error', message: 'It broke.' }),
    );
  });

  it('blames memory when a running worker is killed, without a version check', () => {
    const { hook, workers } = setup();
    act(() => hook.result.current.start('go'));
    act(() => workers[0]?.reply({ type: 'progress', stage: 'working', progress: 0.4 }));
    act(() => workers[0]?.crash());
    expect(hook.result.current.job).toEqual({ status: 'error', message: MEMORY_MESSAGE });
    expect(newer.calls).toBe(0);
  });

  it('drops a late version answer after the user goes back', async () => {
    newer.value = true;
    const { hook, workers } = setup();
    act(() => hook.result.current.start('go'));
    act(() => workers[0]?.crash());
    act(() => hook.result.current.reset());
    await act(() => Promise.resolve());
    expect(hook.result.current.job).toEqual({ status: 'idle' });
  });

  it('an error never carries into the next run', async () => {
    const { hook, workers } = setup();
    act(() => hook.result.current.start('first'));
    act(() => workers[0]?.reply({ type: 'error', message: 'Nope.' }));
    expect(hook.result.current.job.status).toBe('error');

    act(() => hook.result.current.start('second'));
    expect(workers).toHaveLength(2);
    expect(hook.result.current.job).toEqual({ status: 'running', stage: 'working', progress: 0 });
    // The old worker speaking up late changes nothing.
    act(() => workers[0]?.reply({ type: 'error', message: 'Late.' }));
    act(() => workers[1]?.reply({ type: 'done', n: 2 }));
    expect(hook.result.current.job).toEqual({ status: 'done', n: 2 });
  });
});
