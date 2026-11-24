import { act, renderHook } from '@testing-library/react';
import {
  clearRecentTools,
  getRecentTools,
  rememberTool,
  resetRecentCache,
  useRecentTools,
} from './recent';

beforeEach(() => {
  localStorage.clear();
  resetRecentCache();
});

describe('recent tools', () => {
  it('starts empty', () => {
    expect(getRecentTools()).toEqual([]);
  });

  it('keeps the newest first without repeats, four at most', () => {
    for (const id of ['merge', 'split', 'merge', 'sign', 'convert', 'exif']) rememberTool(id);
    expect(getRecentTools()).toEqual(['exif', 'convert', 'sign', 'merge']);
  });

  it('survives a reload through localStorage', () => {
    rememberTool('resize');
    resetRecentCache();
    expect(getRecentTools()).toEqual(['resize']);
  });

  it('ignores unknown ids and junk in storage', () => {
    rememberTool('teleport');
    expect(getRecentTools()).toEqual([]);
    localStorage.setItem('ptk:recent-tools', '["split", 42, "nope"]');
    resetRecentCache();
    expect(getRecentTools()).toEqual(['split']);
    localStorage.setItem('ptk:recent-tools', '{broken');
    resetRecentCache();
    expect(getRecentTools()).toEqual([]);
  });

  it('still works when storage throws', () => {
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    rememberTool('merge');
    expect(getRecentTools()).toEqual(['merge']);
    set.mockRestore();
  });

  it('updates hooks and clears', () => {
    const { result } = renderHook(() => useRecentTools());
    expect(result.current).toEqual([]);
    act(() => rememberTool('sign'));
    expect(result.current).toEqual(['sign']);
    act(() => clearRecentTools());
    expect(result.current).toEqual([]);
  });
});
