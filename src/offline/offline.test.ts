import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getOfflineState, resetOffline, startOffline, wasJustSaved } from './offline';

class FakeWorker extends EventTarget {
  state: ServiceWorkerState = 'installing';
  move(state: ServiceWorkerState) {
    this.state = state;
    this.dispatchEvent(new Event('statechange'));
  }
}

function container(reg: Partial<ServiceWorkerRegistration>, controller: object | null = null) {
  return {
    controller,
    register: vi.fn(async () => reg as ServiceWorkerRegistration),
  } as unknown as ServiceWorkerContainer;
}

beforeEach(() => resetOffline());

describe('offline copy', () => {
  it('saves on the first visit and says when it is ready', async () => {
    const worker = new FakeWorker();
    const sw = container({ installing: worker as unknown as ServiceWorker });
    await startOffline(sw, '/x/sw.js');
    expect(sw.register).toHaveBeenCalledWith('/x/sw.js', expect.anything());
    expect(getOfflineState()).toBe('saving');
    worker.move('installed');
    expect(getOfflineState()).toBe('saving');
    worker.move('activated');
    expect(getOfflineState()).toBe('ready');
    expect(wasJustSaved()).toBe(true);
  });

  it('is ready at once on later visits, without the first-time note', async () => {
    const sw = container({ active: {} as ServiceWorker }, {});
    await startOffline(sw, '/x/sw.js');
    expect(getOfflineState()).toBe('ready');
    expect(wasJustSaved()).toBe(false);
  });

  it('gives up quietly when it cannot be stored', async () => {
    const sw = {
      controller: null,
      register: vi.fn(async () => {
        throw new Error('blocked');
      }),
    } as unknown as ServiceWorkerContainer;
    await startOffline(sw, '/x/sw.js');
    expect(getOfflineState()).toBe('off');
  });

  it('does nothing without service workers', async () => {
    await startOffline(undefined);
    expect(getOfflineState()).toBe('off');
  });
});
