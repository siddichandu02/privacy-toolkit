import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDrawableFile } from './useDrawableFile';

describe('useDrawableFile', () => {
  it('hands back photos the browser can draw as they are', () => {
    const decode = vi.fn();
    const jpg = new File(['j'], 'a.jpg', { type: 'image/jpeg' });
    const { result } = renderHook(() => useDrawableFile(jpg, decode));
    expect(result.current).toBe(jpg);
    expect(decode).not.toHaveBeenCalled();
  });

  it('shows the decoded copy of a HEIC photo once it is ready', async () => {
    const heic = new File(['h'], 'IMG_1.HEIC');
    const png = new File(['p'], 'IMG_1.HEIC', { type: 'image/png' });
    const decode = vi.fn(() => Promise.resolve(png));
    const { result } = renderHook(() => useDrawableFile(heic, decode));
    expect(result.current).toBeNull();
    await waitFor(() => expect(result.current).toBe(png));
  });

  it('stays empty when the HEIC photo cannot be opened', async () => {
    const heic = new File(['h'], 'IMG_2.heic');
    const decode = vi.fn(() => Promise.reject(new Error('bad')));
    const { result } = renderHook(() => useDrawableFile(heic, decode));
    await waitFor(() => expect(decode).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });
});
