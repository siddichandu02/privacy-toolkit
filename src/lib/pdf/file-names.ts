// Small helpers the pages use. Kept apart from the pdf-lib code so the page
// bundle stays light; the heavy work only loads in the workers.

/** "report.pdf" -> "report-merged.pdf". Falls back to "merged.pdf". */
export function mergedName(first?: string): string {
  const base = first?.replace(/\.pdf$/i, '').trim();
  return base ? `${base}-merged.pdf` : 'merged.pdf';
}

/** "report.pdf" -> "report-compressed.pdf". */
export const compressName = (name: string) =>
  `${name.replace(/\.pdf$/i, '').trim() || 'document'}-compressed.pdf`;

/** "scan.pdf" -> "scan-rotated.pdf". */
export const rotateName = (name: string) =>
  `${name.replace(/\.pdf$/i, '').trim() || 'document'}-rotated.pdf`;

/** "lease.pdf" -> "lease-signed.pdf". */
export const signName = (name: string) =>
  `${name.replace(/\.pdf$/i, '').trim() || 'document'}-signed.pdf`;

/** Share of the original size that was saved, as a whole percent (0 to 100). */
export const savedPercent = (before: number, after: number) =>
  before <= 0 ? 0 : Math.max(0, Math.round((1 - after / before) * 100));
