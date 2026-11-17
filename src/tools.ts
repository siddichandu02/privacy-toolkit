import type { Accent } from './components/ui/accent';

export type ToolCategory = 'pdf' | 'image';

export interface ToolInfo {
  id: string;
  name: string;
  category: ToolCategory;
  /** Tailwind color token name used for the tool's accent. */
  accent: Accent;
  /** One plain sentence about what the tool does. */
  blurb: string;
}

/** Tools planned for v1, in build order. */
export const TOOLS: readonly ToolInfo[] = [
  {
    id: 'merge',
    name: 'Merge PDF',
    category: 'pdf',
    accent: 'violet',
    blurb: 'Combine several PDFs into one file, in the order you choose.',
  },
  {
    id: 'split',
    name: 'Split PDF',
    category: 'pdf',
    accent: 'coral',
    blurb: 'Pull out page ranges or single pages into new PDFs.',
  },
  {
    id: 'rotate',
    name: 'Rotate pages',
    category: 'pdf',
    accent: 'sunshine',
    blurb: 'Turn sideways pages upright and drop the ones you do not need.',
  },
  {
    id: 'images-to-pdf',
    name: 'Images to PDF',
    category: 'pdf',
    accent: 'mint',
    blurb: 'Turn photos and scans into a single, tidy PDF.',
  },
  {
    id: 'sign',
    name: 'Sign PDF',
    category: 'pdf',
    accent: 'sky',
    blurb: 'Draw or type your signature and place it on any page.',
  },
  {
    id: 'compress-pdf',
    name: 'Compress PDF',
    category: 'pdf',
    accent: 'coral',
    blurb: 'Shrink a PDF so it fits in an email or upload form.',
  },
  {
    id: 'compress-image',
    name: 'Compress image',
    category: 'image',
    accent: 'mint',
    blurb: 'Make photos smaller while keeping them sharp.',
  },
  {
    id: 'convert',
    name: 'Convert image',
    category: 'image',
    accent: 'sky',
    blurb: 'Switch between HEIC, PNG, WebP and JPG.',
  },
  {
    id: 'resize',
    name: 'Resize and crop',
    category: 'image',
    accent: 'sunshine',
    blurb: 'Fit a photo to a passport, profile or banner size.',
  },
  {
    id: 'exif',
    name: 'Remove EXIF',
    category: 'image',
    accent: 'violet',
    blurb: 'See and strip the location and camera details hidden in a photo.',
  },
];

export function getTool(id: string | undefined): ToolInfo | undefined {
  return TOOLS.find((t) => t.id === id);
}

export const toolPath = (id: string) => `/tools/${id}`;
