import type { Accent } from './components/ui/accent';

export type ToolCategory = 'pdf' | 'image';

export interface ToolInput {
  kind: 'pdf' | 'image';
  multiple: boolean;
  ordered: boolean;
}

export interface ToolInfo {
  id: string;
  name: string;
  category: ToolCategory;
  /** Tailwind color token name used for the tool's accent. */
  accent: Accent;
  /** One plain sentence about what the tool does. */
  blurb: string;
  /** What the tool takes: file kind, one or many, and whether order matters. */
  input: ToolInput;
  /** True once the tool works end to end. */
  ready?: boolean;
}

/** Tools planned for v1, in build order. */
export const TOOLS: readonly ToolInfo[] = [
  {
    id: 'merge',
    name: 'Merge PDF',
    category: 'pdf',
    accent: 'violet',
    blurb: 'Combine several PDFs into one file, in the order you choose.',
    input: { kind: 'pdf', multiple: true, ordered: true },
    ready: true,
  },
  {
    id: 'split',
    name: 'Split PDF',
    category: 'pdf',
    accent: 'coral',
    blurb: 'Pull out page ranges or single pages into new PDFs.',
    input: { kind: 'pdf', multiple: false, ordered: false },
    ready: true,
  },
  {
    id: 'rotate',
    name: 'Rotate pages',
    category: 'pdf',
    accent: 'sunshine',
    blurb: 'Turn sideways pages upright and drop the ones you do not need.',
    input: { kind: 'pdf', multiple: false, ordered: false },
    ready: true,
  },
  {
    id: 'images-to-pdf',
    name: 'Images to PDF',
    category: 'pdf',
    accent: 'mint',
    blurb: 'Turn photos and scans into a single, tidy PDF.',
    input: { kind: 'image', multiple: true, ordered: true },
    ready: true,
  },
  {
    id: 'sign',
    name: 'Sign PDF',
    category: 'pdf',
    accent: 'sky',
    blurb: 'Draw or type your signature and place it on any page.',
    input: { kind: 'pdf', multiple: false, ordered: false },
    ready: true,
  },
  {
    id: 'compress-pdf',
    name: 'Compress PDF',
    category: 'pdf',
    accent: 'coral',
    blurb: 'Shrink a PDF so it fits in an email or upload form.',
    input: { kind: 'pdf', multiple: false, ordered: false },
    ready: true,
  },
  {
    id: 'compress-image',
    name: 'Compress image',
    category: 'image',
    accent: 'mint',
    blurb: 'Make photos smaller while keeping them sharp.',
    input: { kind: 'image', multiple: true, ordered: false },
  },
  {
    id: 'convert',
    name: 'Convert image',
    category: 'image',
    accent: 'sky',
    blurb: 'Switch between HEIC, PNG, WebP and JPG.',
    input: { kind: 'image', multiple: true, ordered: false },
  },
  {
    id: 'resize',
    name: 'Resize and crop',
    category: 'image',
    accent: 'sunshine',
    blurb: 'Fit a photo to a passport, profile or banner size.',
    input: { kind: 'image', multiple: false, ordered: false },
  },
  {
    id: 'exif',
    name: 'Remove EXIF',
    category: 'image',
    accent: 'violet',
    blurb: 'See and strip the location and camera details hidden in a photo.',
    input: { kind: 'image', multiple: true, ordered: false },
  },
];

export function getTool(id: string | undefined): ToolInfo | undefined {
  return TOOLS.find((t) => t.id === id);
}

export const toolPath = (id: string) => `/tools/${id}`;

export type CategoryFilter = 'all' | ToolCategory;

/** Normalise for search: lowercase, no accents, single spaces. */
const fold = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Tools in the chosen category whose name or blurb contains every word of the
 * query, in any order. An empty query matches everything.
 */
export function filterTools(
  tools: readonly ToolInfo[],
  category: CategoryFilter,
  query: string,
): ToolInfo[] {
  const words = fold(query).split(' ').filter(Boolean);
  return tools.filter((t) => {
    if (category !== 'all' && t.category !== category) return false;
    const haystack = fold(`${t.name} ${t.blurb}`);
    return words.every((w) => haystack.includes(w));
  });
}
