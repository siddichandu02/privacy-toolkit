import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { __test } from '../../lib/netWatch';
import { PrivacyProof } from './PrivacyProof';

const setOnline = (value: boolean) => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => value });
  window.dispatchEvent(new Event(value ? 'online' : 'offline'));
};

describe('PrivacyProof', () => {
  afterEach(() => {
    __test.reset();
    setOnline(true);
  });

  it('reads zero while every request is to this site', () => {
    render(<PrivacyProof />);
    act(() =>
      __test.record([
        { name: '/privacy-toolkit/assets/merge.worker-abc.js', startTime: 1, transferSize: 2048 },
      ]),
    );
    expect(screen.getByTestId('bytes-sent')).toHaveTextContent(/^0$/);
    expect(screen.getByTestId('privacy-proof')).toHaveAttribute('data-clean', 'true');
    expect(screen.getByTestId('last-request')).toHaveTextContent(
      'Last request: merge.worker-abc.js, from this site',
    );
  });

  it('names any other site in coral, it never hides one', () => {
    render(<PrivacyProof />);
    act(() =>
      __test.record([
        { name: 'https://tracker.example.com/p.gif', startTime: 1, transferSize: 43 },
      ]),
    );
    expect(screen.getByTestId('privacy-proof')).toHaveAttribute('data-clean', 'false');
    expect(screen.getByTestId('bytes-sent')).toHaveTextContent('43 B');
    expect(screen.getByText(/requests to tracker.example.com/i)).toBeInTheDocument();
  });

  it('only counts requests after `since`', () => {
    render(<PrivacyProof since={100} scope="tool" />);
    act(() =>
      __test.record([{ name: 'https://old.example.com/x', startTime: 5, transferSize: 9 }]),
    );
    expect(screen.getByTestId('privacy-proof')).toHaveAttribute('data-clean', 'true');
    expect(screen.getByText(/nothing has been loaded by this tool/i)).toBeInTheDocument();
  });

  it('notices when the connection drops', async () => {
    render(<PrivacyProof />);
    expect(screen.getByTestId('offline-tip')).toHaveTextContent(/turn off your wi-fi/i);
    act(() => setOnline(false));
    expect(await screen.findByText(/you're offline/i)).toBeInTheDocument();
  });
});
