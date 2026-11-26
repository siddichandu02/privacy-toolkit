import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/ui';
import { OfflineNotice } from './OfflineNotice';
import { resetOffline, startOffline } from './offline';

class FakeWorker extends EventTarget {
  state: ServiceWorkerState = 'installing';
}

beforeEach(() => resetOffline());

describe('OfflineNotice', () => {
  it('says once that the tools work offline after the first save', async () => {
    const worker = new FakeWorker();
    const sw = {
      controller: null,
      register: vi.fn(async () => ({ installing: worker })),
    } as unknown as ServiceWorkerContainer;
    render(
      <ToastProvider>
        <OfflineNotice />
      </ToastProvider>,
    );
    await act(() => startOffline(sw, '/sw.js'));
    expect(screen.queryByText('Ready to work offline')).toBeNull();
    act(() => {
      worker.state = 'activated';
      worker.dispatchEvent(new Event('statechange'));
    });
    expect(await screen.findByText('Ready to work offline')).toBeVisible();
  });
});
