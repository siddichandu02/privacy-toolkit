import { afterEach, describe, expect, it, vi } from 'vitest';
import { entryScript, hasNewerVersion } from './appVersion';

const page = (hash: string) =>
  `<!doctype html><head><script>theme()</script><script type="module" crossorigin src="/privacy-toolkit/assets/index-${hash}.js"></script></head>`;

describe('entryScript', () => {
  it('finds the hashed entry module', () => {
    expect(entryScript(page('AbC_12-3'))).toBe('assets/index-AbC_12-3.js');
  });

  it('ignores pages without one', () => {
    expect(entryScript('<script src="/x.js"></script>')).toBeNull();
    expect(entryScript('<script type="module" src="/src/main.tsx"></script>')).toBeNull();
  });
});

describe('hasNewerVersion', () => {
  afterEach(() => {
    document.head.innerHTML = '';
    vi.unstubAllGlobals();
  });

  const loadedWith = (hash: string) => {
    const script = document.createElement('script');
    script.type = 'module';
    script.setAttribute('src', `/privacy-toolkit/assets/index-${hash}.js`);
    document.head.append(script);
  };
  const serve = (body: string, ok = true) =>
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok, text: () => Promise.resolve(body) })),
    );

  it('is true when the live page names a different entry', async () => {
    loadedWith('old111');
    serve(page('new222'));
    expect(await hasNewerVersion()).toBe(true);
  });

  it('is false when nothing changed', async () => {
    loadedWith('same11');
    serve(page('same11'));
    expect(await hasNewerVersion()).toBe(false);
  });

  it('is false when the check fails or the page has no entry (dev)', async () => {
    loadedWith('old111');
    serve('', false);
    expect(await hasNewerVersion()).toBe(false);
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline'))),
    );
    expect(await hasNewerVersion()).toBe(false);
    document.head.innerHTML = '';
    serve(page('new222'));
    expect(await hasNewerVersion()).toBe(false);
  });
});
