import { useSyncExternalStore } from 'react';

/** Phones: narrower than Tailwind's `sm` breakpoint. */
export const PHONE_QUERY = '(max-width: 639px)';

/** Touch screens, where files are picked rather than dragged in. */
export const TOUCH_QUERY = '(pointer: coarse)';

function media(query: string): MediaQueryList | undefined {
  return typeof window !== 'undefined' ? window.matchMedia?.(query) : undefined;
}

/** Follows a CSS media query and re-renders when it starts or stops matching. */
export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const list = media(query);
      list?.addEventListener?.('change', notify);
      return () => list?.removeEventListener?.('change', notify);
    },
    () => media(query)?.matches === true,
    () => false,
  );
}
