import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import type { Plugin } from 'vite';

/** Every file in a folder, as forward-slash paths relative to it. */
function walk(dir: string, root = dir): string[] {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  return names.flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory()
      ? walk(path, root)
      : [relative(root, path).split(sep).join('/')];
  });
}

/** The files the offline copy keeps: everything built, minus source maps and the worker itself. */
export function offlineFiles(built: readonly string[], publicFiles: readonly string[]): string[] {
  const keep = (file: string) => !file.endsWith('.map') && file !== 'sw.js' && file !== '404.html';
  return [...new Set([...built, ...publicFiles].filter(keep))].sort();
}

/** Short hash of the file list. Hashed names change with content, so this changes with any edit. */
export const offlineVersion = (files: readonly string[]) =>
  createHash('sha256').update(files.join('\n')).digest('hex').slice(0, 12);

export function serviceWorkerSource(template: string, files: readonly string[]): string {
  return template
    .replace('__VERSION__', offlineVersion(files))
    .replace('__FILES__', JSON.stringify(files));
}

/**
 * Writes sw.js next to index.html so the whole app (every tool, worker and
 * font) keeps working with no connection after the first visit.
 */
export function offline(): Plugin {
  let publicDir = '';
  let root = '';
  return {
    name: 'offline-copy',
    apply: 'build',
    configResolved(config) {
      publicDir = config.publicDir;
      root = config.root;
    },
    generateBundle(_options, bundle) {
      // index.html is added to the bundle after this hook, so name it here.
      const files = offlineFiles(
        [...Object.keys(bundle), 'index.html'],
        publicDir ? walk(publicDir) : [],
      );
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: serviceWorkerSource(readFileSync(resolve(root, 'build/sw.js'), 'utf8'), files),
      });
    },
  };
}
