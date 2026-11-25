import { useEffect, useState } from 'react';
import { isHeic } from '../../lib/image/convert-names';
import { decodeHeicOnce } from '../../lib/image/heic';

/**
 * Something an <img> can show for this file: the file itself, or for a HEIC
 * photo a PNG copy opened on this device (once per photo). Null while the
 * copy is being made or when it cannot be made.
 */
export function useDrawableFile(
  file: File | null,
  decode: (file: File) => Promise<File> = decodeHeicOnce,
): File | null {
  const heic = file ? isHeic(file) : false;
  const [copy, setCopy] = useState<{ from: File; file: File | null } | null>(null);

  useEffect(() => {
    if (!file || !heic) return;
    let live = true;
    decode(file).then(
      (decoded) => live && setCopy({ from: file, file: decoded }),
      () => live && setCopy({ from: file, file: null }),
    );
    return () => {
      live = false;
    };
  }, [file, heic, decode]);

  if (!file) return null;
  if (!heic) return file;
  return copy?.from === file ? copy.file : null;
}
