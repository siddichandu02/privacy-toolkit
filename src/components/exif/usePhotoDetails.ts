import { useEffect, useState } from 'react';
import type { PhotoDetails } from '../../lib/image/exif-details';
import { readPhotoDetails } from '../../lib/image/exif-read';

type Read = (file: File) => Promise<PhotoDetails>;

const defaultRead: Read = async (file) => readPhotoDetails(await file.arrayBuffer());

/** Each file is read once, however often the list changes. */
const cache = new WeakMap<File, Promise<PhotoDetails>>();

function detailsFor(file: File, read: Read): Promise<PhotoDetails> {
  let pending = cache.get(file);
  if (!pending) {
    pending = read(file);
    cache.set(file, pending);
  }
  return pending;
}

/**
 * What is hidden in each photo, read on this device as soon as it is added.
 * Photos not read yet are missing from the map. `read` is injectable for tests.
 */
export function usePhotoDetails(
  files: readonly File[],
  read: Read = defaultRead,
): Map<File, PhotoDetails> {
  const [found, setFound] = useState<Map<File, PhotoDetails>>(() => new Map());

  useEffect(() => {
    let live = true;
    for (const file of files) {
      void detailsFor(file, read).then((details) => {
        if (!live) return;
        setFound((prev) => {
          if (prev.get(file) === details) return prev;
          const next = new Map(prev);
          next.set(file, details);
          return next;
        });
      });
    }
    return () => {
      live = false;
    };
  }, [files, read]);

  return found;
}
