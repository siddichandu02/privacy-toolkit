import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { __test } from '../../lib/netWatch';
import { PrivacyPill } from './PrivacyPill';

describe('PrivacyPill', () => {
  afterEach(() => __test.reset());

  it('shows a live zero and opens the full check', async () => {
    render(<PrivacyPill since={0} />);
    const pill = screen.getByRole('button', { name: /0 bytes sent/i });
    expect(pill).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(pill);
    expect(pill).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: 'Privacy check' })).toBeInTheDocument();
  });

  it('turns coral if anything goes to another site', () => {
    render(<PrivacyPill since={0} />);
    act(() => __test.record([{ name: 'https://elsewhere.example/x', startTime: 2 }]));
    expect(screen.getByRole('button', { name: /something was sent/i })).toBeInTheDocument();
  });
});
