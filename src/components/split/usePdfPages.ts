import { useEffect, useState } from 'react';
import { openPdfPages, type PdfPages } from '../drop/preview';

export type PdfPagesState =
  { status: 'loading' } | { status: 'ready'; pages: PdfPages } | { status: 'error' };

/** Open a PDF for drawing its pages, and close it when the file changes. */
export function usePdfPages(file: File | undefined): PdfPagesState {
  // Remember which file the state belongs to, so a new file reads as loading.
  const [held, setHeld] = useState<{ file: File; state: PdfPagesState } | null>(null);
  useEffect(() => {
    if (!file) return;
    let alive = true;
    let opened: PdfPages | null = null;
    openPdfPages(file).then(
      (pages) => {
        opened = pages;
        if (alive) setHeld({ file, state: { status: 'ready', pages } });
        else pages.close();
      },
      () => {
        if (alive) setHeld({ file, state: { status: 'error' } });
      },
    );
    return () => {
      alive = false;
      opened?.close();
    };
  }, [file]);
  return held && held.file === file ? held.state : { status: 'loading' };
}
