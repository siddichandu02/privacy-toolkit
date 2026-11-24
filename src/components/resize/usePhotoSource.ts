import { useCallback, useEffect, useState } from 'react';
import { isHeic } from '../../lib/image/convert-names';
import { decodeHeicOnce, prefetchHeic } from '../../lib/image/heic';
import { useObjectUrl } from '../result/useObjectUrl';

export interface PhotoSource {
  /** Something the browser can draw: the picked file, or a PNG copy of a HEIC photo. */
  file: File | null;
  url: string | null;
  /** Upright size in pixels, once the picture has loaded. */
  size: { width: number; height: number } | null;
  /** True while a HEIC photo is being opened. */
  decoding: boolean;
  /** The photo could not be opened or shown. */
  failed: boolean;
  /** Call from the <img> onLoad and onError. */
  onLoad: (img: HTMLImageElement) => void;
  onError: () => void;
}

interface Decoded {
  from: File;
  file: File | null;
  failed: boolean;
}

/**
 * Get one photo ready to show and cut. HEIC photos are opened on this device
 * first (once), and the same copy goes to the worker, so the crop on screen
 * matches the result exactly.
 */
export function usePhotoSource(
  picked: File | null,
  decode: (file: File) => Promise<File> = decodeHeicOnce,
): PhotoSource {
  const heic = picked ? isHeic(picked) : false;
  const [decoded, setDecoded] = useState<Decoded | null>(null);
  const [size, setSize] = useState<{ from: File; width: number; height: number } | null>(null);
  const [broken, setBroken] = useState<File | null>(null);

  useEffect(() => {
    if (!picked || !heic) return;
    prefetchHeic();
    let live = true;
    decode(picked).then(
      (file) => live && setDecoded({ from: picked, file, failed: false }),
      () => live && setDecoded({ from: picked, file: null, failed: true }),
    );
    return () => {
      live = false;
    };
  }, [picked, heic, decode]);

  const ready = heic ? (decoded?.from === picked ? decoded : null) : null;
  const file = picked && (heic ? (ready?.file ?? null) : picked);
  const url = useObjectUrl(file);

  const onLoad = useCallback(
    (img: HTMLImageElement) => {
      if (!picked || !img.naturalWidth || !img.naturalHeight) return;
      setSize({ from: picked, width: img.naturalWidth, height: img.naturalHeight });
    },
    [picked],
  );
  const onError = useCallback(() => setBroken(picked), [picked]);

  return {
    file,
    url,
    size: size && size.from === picked ? { width: size.width, height: size.height } : null,
    decoding: heic && !ready,
    failed: Boolean(picked) && (broken === picked || Boolean(ready?.failed)),
    onLoad,
    onError,
  };
}
