import { afterEach, describe, expect, it, vi } from 'vitest';
import { migrateStorageKeys } from './storageKeys';

describe('migrateStorageKeys', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('copies old keys to the new names and drops the old ones', () => {
    localStorage.setItem('pt-theme', 'light');
    localStorage.setItem('ptk:recent-tools', '["merge"]');
    localStorage.setItem('ptk:install-later', '123');
    migrateStorageKeys();
    expect(localStorage.getItem('pdfpip:theme')).toBe('light');
    expect(localStorage.getItem('pdfpip:recent-tools')).toBe('["merge"]');
    expect(localStorage.getItem('pdfpip:install-later')).toBe('123');
    expect(localStorage.getItem('pt-theme')).toBeNull();
    expect(localStorage.getItem('ptk:recent-tools')).toBeNull();
    expect(localStorage.getItem('ptk:install-later')).toBeNull();
  });

  it('keeps a value already saved under the new key', () => {
    localStorage.setItem('pt-theme', 'light');
    localStorage.setItem('pdfpip:theme', 'dark');
    migrateStorageKeys();
    expect(localStorage.getItem('pdfpip:theme')).toBe('dark');
    expect(localStorage.getItem('pt-theme')).toBeNull();
  });

  it('does nothing when there is nothing to move', () => {
    migrateStorageKeys();
    expect(localStorage.length).toBe(0);
  });

  it('survives blocked storage', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
    } as unknown as Storage;
    expect(() => migrateStorageKeys(blocked)).not.toThrow();
    expect(() => migrateStorageKeys(undefined)).not.toThrow();
  });
});
