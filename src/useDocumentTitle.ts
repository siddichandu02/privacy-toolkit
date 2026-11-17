import { useEffect } from 'react';

const SITE = 'Privacy Toolkit';

/** Sets the tab title for the current page, e.g. "Merge PDF | Privacy Toolkit". */
export function useDocumentTitle(page?: string) {
  useEffect(() => {
    document.title = page ? `${page} | ${SITE}` : SITE;
  }, [page]);
}
