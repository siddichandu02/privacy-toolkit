/** What a drop zone accepts. */
export interface DropRules {
  /** File extensions with the dot, lowercase, e.g. ['.pdf']. */
  extensions: readonly string[];
  /** MIME types that also count as a match, e.g. ['application/pdf']. */
  mimeTypes?: readonly string[];
  /** Largest single file in bytes. */
  maxSize?: number;
  /** Most files the list can hold in total. */
  maxFiles?: number;
  /** Plain name for the accepted kind, used in messages ("PDFs", "images"). */
  kindLabel: string;
  /** The same for one file ("a PDF"), used when maxFiles is 1. */
  singleLabel?: string;
}

export type RejectReason = 'type' | 'size' | 'count' | 'empty';

export interface Rejection {
  name: string;
  reason: RejectReason;
  message: string;
}

export interface ValidationResult {
  accepted: File[];
  rejected: Rejection[];
}

const UNITS = ['B', 'KB', 'MB', 'GB'] as const;

/** 1536 -> "1.5 KB". One decimal under 10, none above. */
export function formatBytes(bytes: number): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = unit === 0 || value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${UNITS[unit]}`;
}

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot <= 0 ? '' : name.slice(dot).toLowerCase();
}

export function matchesType(file: File, rules: DropRules): boolean {
  if (rules.extensions.includes(extensionOf(file.name))) return true;
  return Boolean(file.type && rules.mimeTypes?.includes(file.type));
}

/** Value for an <input type="file"> accept attribute. */
export function acceptAttr(rules: DropRules): string {
  return [...rules.extensions, ...(rules.mimeTypes ?? [])].join(',');
}

/**
 * Split incoming files into the ones that fit the rules and the ones that do
 * not, with a short reason for each. `existing` is how many files the list
 * already holds, so the count limit covers the whole list.
 */
export function validateFiles(
  incoming: readonly File[],
  rules: DropRules,
  existing = 0,
): ValidationResult {
  const accepted: File[] = [];
  const rejected: Rejection[] = [];
  const room = rules.maxFiles === undefined ? Infinity : Math.max(0, rules.maxFiles - existing);

  for (const file of incoming) {
    const name = file.name;
    if (!matchesType(file, rules)) {
      rejected.push({
        name,
        reason: 'type',
        message: `${name} is not one of the ${rules.kindLabel} this tool takes.`,
      });
    } else if (file.size === 0) {
      rejected.push({ name, reason: 'empty', message: `${name} is empty.` });
    } else if (rules.maxSize !== undefined && file.size > rules.maxSize) {
      rejected.push({
        name,
        reason: 'size',
        message: `${name} is ${formatBytes(file.size)}. The limit is ${formatBytes(rules.maxSize)}.`,
      });
    } else if (accepted.length >= room) {
      rejected.push({
        name,
        reason: 'count',
        message:
          rules.maxFiles === 1
            ? `${name} was left out. This tool works on one file at a time.`
            : `${name} was left out. You can add up to ${rules.maxFiles} files.`,
      });
    } else {
      accepted.push(file);
    }
  }
  return { accepted, rejected };
}

export const PDF_RULES: DropRules = {
  extensions: ['.pdf'],
  mimeTypes: ['application/pdf'],
  maxSize: 200 * 1024 * 1024,
  maxFiles: 50,
  kindLabel: 'PDFs',
  singleLabel: 'a PDF',
};

export const IMAGE_RULES: DropRules = {
  extensions: ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.gif'],
  mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif'],
  maxSize: 50 * 1024 * 1024,
  maxFiles: 100,
  kindLabel: 'images',
  singleLabel: 'an image',
};

/** "PDFs", or "a PDF" when the zone takes a single file. */
export function zoneNoun(rules: DropRules): string {
  return rules.maxFiles === 1 && rules.singleLabel ? rules.singleLabel : rules.kindLabel;
}

/** Rules for a tool's input: its file kind, limited to one file if it works on one. */
export function rulesFor(input: { kind: 'pdf' | 'image'; multiple: boolean }): DropRules {
  const base = input.kind === 'pdf' ? PDF_RULES : IMAGE_RULES;
  return input.multiple ? base : { ...base, maxFiles: 1 };
}
