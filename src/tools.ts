export type ToolCategory = 'pdf' | 'image';

export interface ToolInfo {
  id: string;
  name: string;
  category: ToolCategory;
  /** Tailwind color token name used for the tool's accent. */
  accent: 'violet' | 'coral' | 'mint' | 'sunshine' | 'sky';
}

/** Tools planned for v1, in build order. */
export const TOOLS: readonly ToolInfo[] = [
  { id: 'merge', name: 'Merge PDF', category: 'pdf', accent: 'violet' },
  { id: 'split', name: 'Split PDF', category: 'pdf', accent: 'coral' },
  { id: 'rotate', name: 'Rotate pages', category: 'pdf', accent: 'sunshine' },
  { id: 'images-to-pdf', name: 'Images to PDF', category: 'pdf', accent: 'mint' },
  { id: 'sign', name: 'Sign PDF', category: 'pdf', accent: 'sky' },
  { id: 'compress-pdf', name: 'Compress PDF', category: 'pdf', accent: 'coral' },
  { id: 'compress-image', name: 'Compress image', category: 'image', accent: 'mint' },
  { id: 'convert', name: 'Convert image', category: 'image', accent: 'sky' },
  { id: 'resize', name: 'Resize and crop', category: 'image', accent: 'sunshine' },
  { id: 'exif', name: 'Remove EXIF', category: 'image', accent: 'violet' },
];
