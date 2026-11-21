import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useThumbnails } from './useThumbnails';

vi.mock('../drop/preview', () => ({
  makePreview: vi.fn((file: File) =>
    file.name.startsWith('bad')
      ? Promise.reject(new Error('nope'))
      : Promise.resolve({ url: `blob:${file.name}`, pages: 1 }),
  ),
}));

const file = (name: string) => new File(['x'], name, { type: 'application/pdf' });

describe('useThumbnails', () => {
  it('draws up to max files and skips the ones that fail', async () => {
    const files = [file('a.pdf'), file('bad.pdf'), file('c.pdf'), file('d.pdf')];
    const { result } = renderHook(() => useThumbnails(files, 3));
    await waitFor(() => expect(result.current).toEqual(['blob:a.pdf', 'blob:c.pdf']));
  });

  it('releases the pictures when it goes away', async () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const files = [file('a.pdf')];
    const { result, unmount } = renderHook(() => useThumbnails(files));
    await waitFor(() => expect(result.current).toEqual(['blob:a.pdf']));
    unmount();
    expect(revoke).toHaveBeenCalledWith('blob:a.pdf');
    revoke.mockRestore();
  });
});
