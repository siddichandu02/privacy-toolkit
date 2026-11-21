import { useEffect, useState } from 'react';
import { makePreview } from '../drop/preview';

/**
 * Tiny first-page pictures of the user's own files, for the wait scenes to
 * carry around. Drawn on the device, at most `max` of them, and released when
 * the scene goes away. Files that cannot be drawn are simply left out.
 */
export function useThumbnails(files: readonly File[], max = 4, width = 48): string[] {
  const [urls, setUrls] = useState<string[]>([]);
  const picked = files.slice(0, max);
  const key = picked.map((f) => `${f.name}:${f.size}:${f.lastModified}`).join('|');

  useEffect(() => {
    let alive = true;
    const made: string[] = [];
    const list = files.slice(0, max);
    void Promise.all(
      list.map((file) =>
        makePreview(file, width).then(
          (p) => p.url,
          () => null,
        ),
      ),
    ).then((results) => {
      for (const url of results) if (url) made.push(url);
      if (alive) setUrls([...made]);
      else made.forEach((url) => URL.revokeObjectURL(url));
    });
    return () => {
      alive = false;
      made.forEach((url) => URL.revokeObjectURL(url));
    };
    // `key` stands in for the file list, which is a new array on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, max, width]);

  return urls;
}
