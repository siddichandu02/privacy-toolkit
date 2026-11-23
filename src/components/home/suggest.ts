import { TOOLS, type ToolInfo } from '../../tools';
import { isHeic } from '../../lib/image/convert-names';
import { IMAGE_RULES, PDF_RULES, matchesType } from '../drop/validate';

type Kind = 'pdf' | 'image';

export interface Sorted {
  pdf: File[];
  image: File[];
  /** Files no tool can open yet. */
  other: File[];
}

export function sortFiles(files: readonly File[]): Sorted {
  const out: Sorted = { pdf: [], image: [], other: [] };
  for (const f of files) {
    if (matchesType(f, PDF_RULES)) out.pdf.push(f);
    else if (matchesType(f, IMAGE_RULES)) out.image.push(f);
    else out.other.push(f);
  }
  return out;
}

/** The order tools are offered in for one PDF, for several, and for photos. */
const ORDER: Record<'onePdf' | 'manyPdf' | 'image' | 'heic', readonly string[]> = {
  onePdf: ['compress-pdf', 'split', 'sign', 'rotate', 'merge'],
  manyPdf: ['merge', 'compress-pdf', 'split', 'sign', 'rotate'],
  image: ['images-to-pdf', 'compress-image', 'convert', 'resize', 'exif'],
  // iPhone photos most often need to become JPG before anything else.
  heic: ['convert', 'images-to-pdf', 'compress-image', 'resize', 'exif'],
};

/** Working tools that can open these files, most likely first. */
export function suggestTools(sorted: Sorted, tools: readonly ToolInfo[] = TOOLS): ToolInfo[] {
  const ids = [
    ...(sorted.pdf.length ? ORDER[sorted.pdf.length > 1 ? 'manyPdf' : 'onePdf'] : []),
    ...(sorted.image.length ? ORDER[sorted.image.every(isHeic) ? 'heic' : 'image'] : []),
  ];
  const ready = tools.filter((t) => t.ready);
  const picked = ids.flatMap((id) => ready.filter((t) => t.id === id));
  // Anything ready that the order list does not know about yet goes last.
  const rest = ready.filter((t) => !picked.includes(t) && sorted[t.input.kind as Kind].length > 0);
  return [...picked, ...rest];
}
