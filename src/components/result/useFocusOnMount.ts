import { useEffect, useRef } from 'react';

/** Puts keyboard and screen reader focus on an element (usually a heading) when it appears. */
export function useFocusOnMount<T extends HTMLElement>(enabled = true) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (enabled) ref.current?.focus();
  }, [enabled]);
  return ref;
}
