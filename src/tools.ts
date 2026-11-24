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
  /** Other words people search with, e.g. "join" for merge. */
  keywords?: readonly string[];
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
    keywords: ['join', 'combine', 'stitch'],
    ready: true,
  },
  {
    id: 'split',
    name: 'Split PDF',
    category: 'pdf',
    accent: 'coral',
    blurb: 'Pull out page ranges or single pages into new PDFs.',
    input: { kind: 'pdf', multiple: false, ordered: false },
    keywords: ['extract', 'cut', 'separate', 'pages'],
    ready: true,
  },
  {
    id: 'rotate',
    name: 'Rotate pages',
    category: 'pdf',
    accent: 'sunshine',
    blurb: 'Turn sideways pages upright and drop the ones you do not need.',
    input: { kind: 'pdf', multiple: false, ordered: false },
    keywords: ['turn', 'delete', 'remove', 'upside down', 'landscape'],
    ready: true,
  },
  {
    id: 'images-to-pdf',
    name: 'Images to PDF',
    category: 'pdf',
    accent: 'mint',
    blurb: 'Turn photos and scans into a single, tidy PDF.',
    input: { kind: 'image', multiple: true, ordered: true },
    keywords: ['jpg', 'png', 'scan', 'photos'],
    ready: true,
  },
  {
    id: 'sign',
    name: 'Sign PDF',
    category: 'pdf',
    accent: 'sky',
    blurb: 'Draw or type your signature and place it on any page.',
    input: { kind: 'pdf', multiple: false, ordered: false },
    keywords: ['signature', 'autograph', 'initials'],
    ready: true,
  },
  {
    id: 'compress-pdf',
    name: 'Compress PDF',
    category: 'pdf',
    accent: 'coral',
    blurb: 'Shrink a PDF so it fits in an email or a web form.',
    input: { kind: 'pdf', multiple: false, ordered: false },
    keywords: ['shrink', 'smaller', 'reduce', 'email'],
    ready: true,
  },
  {
    id: 'compress-image',
    name: 'Compress image',
    category: 'image',
    accent: 'mint',
    blurb: 'Make photos smaller while keeping them sharp.',
    input: { kind: 'image', multiple: true, ordered: false },
    keywords: ['shrink', 'smaller', 'reduce', 'optimize'],
    ready: true,
  },
  {
    id: 'convert',
    name: 'Convert image',
    category: 'image',
    accent: 'sky',
    blurb: 'Switch between HEIC, PNG, WebP and JPG.',
    input: { kind: 'image', multiple: true, ordered: false },
    keywords: ['jpg', 'jpeg', 'png', 'webp', 'iphone', 'format'],
    ready: true,
  },
  {
    id: 'resize',
    name: 'Resize and crop',
    category: 'image',
    accent: 'sunshine',
    blurb: 'Fit photos to a passport, profile or banner size.',
    input: { kind: 'image', multiple: true, ordered: false },
    keywords: ['crop', 'passport', 'instagram', 'linkedin', 'profile', 'dimensions'],
    ready: true,
  },
  {
    id: 'exif',
    name: 'Remove EXIF',
    category: 'image',
    accent: 'violet',
    blurb: 'See and strip the location and camera details hidden in a photo.',
    input: { kind: 'image', multiple: true, ordered: false },
    keywords: ['gps', 'location', 'metadata', 'privacy', 'strip'],
    ready: true,
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
    const haystack = fold(`${t.name} ${t.blurb} ${(t.keywords ?? []).join(' ')}`);
    return words.every((w) => haystack.includes(w));
  });
}

/**
 * How well one tool matches a query, for the command palette: 0 means no
 * match. Every word has to hit somewhere; a word that starts the name or a
 * name word beats a keyword, which beats the blurb.
 */
export function matchScore(tool: ToolInfo, query: string): number {
  const words = fold(query).split(' ').filter(Boolean);
  if (words.length === 0) return 1;
  const name = fold(tool.name);
  const nameWords = name.split(' ');
  const keywords = (tool.keywords ?? []).map(fold);
  const blurb = fold(tool.blurb);
  let score = 0;
  for (const w of words) {
    if (name.startsWith(w)) score += 8;
    else if (nameWords.some((n) => n.startsWith(w))) score += 6;
    else if (name.includes(w)) score += 4;
    else if (keywords.some((k) => k.startsWith(w))) score += 3;
    else if (keywords.some((k) => k.includes(w)) || blurb.includes(w)) score += 1;
    else return 0;
  }
  return score;
}

/** Tools that match the query, best first; ties keep registry order. */
export function rankTools(tools: readonly ToolInfo[], query: string): ToolInfo[] {
  return tools
    .map((tool, index) => ({ tool, index, score: matchScore(tool, query) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((r) => r.tool);
}
