import { useEffect } from 'react';

const SITE = 'PDFPip';

/** Sets the tab title for the current page, e.g. "Merge PDF | PDFPip". */
export function useDocumentTitle(page?: string) {
  useEffect(() => {
    document.title = page ? `${page} | ${SITE}` : SITE;
  }, [page]);
}
