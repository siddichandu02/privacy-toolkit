import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { offlineFiles, offlineVersion, serviceWorkerSource } from './offline';

describe('offline copy', () => {
  it('keeps built and public files, without maps or itself', () => {
    expect(
      offlineFiles(
        ['index.html', 'assets/index-a1.js', 'assets/index-a1.js.map', 'sw.js'],
        ['favicon.svg', 'manifest.webmanifest', 'index.html'],
      ),
    ).toEqual(['assets/index-a1.js', 'favicon.svg', 'index.html', 'manifest.webmanifest']);
  });

  it('gets a new version whenever a file name changes', () => {
    const a = offlineVersion(['assets/index-a1.js']);
    expect(a).toMatch(/^[0-9a-f]{12}$/);
    expect(offlineVersion(['assets/index-a1.js'])).toBe(a);
    expect(offlineVersion(['assets/index-b2.js'])).not.toBe(a);
  });

  it('fills the file list and version into the worker', () => {
    const template = readFileSync('build/sw.js', 'utf8');
    const source = serviceWorkerSource(template, ['index.html', 'assets/x.js']);
    expect(source).toContain('const FILES = ["index.html","assets/x.js"];');
    expect(source).toContain(`const VERSION = '${offlineVersion(['index.html', 'assets/x.js'])}';`);
    expect(source).not.toMatch(/__\w+__/);
  });
});
