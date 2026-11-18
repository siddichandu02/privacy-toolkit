import { useEffect, useState } from 'react';

/**
 * An object URL for `blob`, revoked when the blob changes or the component
 * unmounts. Created in an effect (not during render) so strict mode's extra
 * mount and unmount never leaves us holding a revoked URL.
 */
export function useObjectUrl(blob: Blob): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const next = URL.createObjectURL(blob);
    // Syncing with an outside resource that needs cleanup; there is no render-time equivalent.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}
