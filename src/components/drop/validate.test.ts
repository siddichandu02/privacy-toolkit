import { describe, expect, it } from 'vitest';
import {
  acceptAttr,
  extensionOf,
  formatBytes,
  IMAGE_RULES,
  PDF_RULES,
  rulesFor,
  validateFiles,
  zoneNoun,
  type DropRules,
} from './validate';

const file = (name: string, size = 10, type = '') =>
  new File([new Uint8Array(size)], name, { type });

describe('formatBytes', () => {
  it('formats each unit', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(900)).toBe('900 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(20 * 1024)).toBe('20 KB');
    expect(formatBytes(5.25 * 1024 * 1024)).toBe('5.3 MB');
    expect(formatBytes(3 * 1024 ** 3)).toBe('3 GB');
  });
});

describe('extensionOf', () => {
  it('lowercases and keeps the dot', () => {
    expect(extensionOf('Report.PDF')).toBe('.pdf');
    expect(extensionOf('a.b.png')).toBe('.png');
  });
  it('has none for dotfiles and bare names', () => {
    expect(extensionOf('.hidden')).toBe('');
    expect(extensionOf('README')).toBe('');
  });
});

describe('validateFiles', () => {
  const rules: DropRules = {
    extensions: ['.pdf'],
    mimeTypes: ['application/pdf'],
    maxSize: 100,
    maxFiles: 3,
    kindLabel: 'PDFs',
  };

  it('accepts by extension or mime type', () => {
    const r = validateFiles([file('a.pdf'), file('noext', 10, 'application/pdf')], rules);
    expect(r.accepted.map((f) => f.name)).toEqual(['a.pdf', 'noext']);
    expect(r.rejected).toEqual([]);
  });

  it('rejects the wrong type with a plain message', () => {
    const r = validateFiles([file('cat.png', 10, 'image/png')], rules);
    expect(r.rejected[0]).toMatchObject({ name: 'cat.png', reason: 'type' });
    expect(r.rejected[0]?.message).toMatch(/not one of the PDFs/);
  });

  it('rejects empty and oversized files', () => {
    const r = validateFiles([file('empty.pdf', 0), file('big.pdf', 101)], rules);
    expect(r.rejected.map((x) => x.reason)).toEqual(['empty', 'size']);
    expect(r.rejected[1]?.message).toBe('big.pdf is 101 B. The limit is 100 B.');
  });

  it('counts files already in the list toward the limit', () => {
    const r = validateFiles([file('1.pdf'), file('2.pdf')], rules, 2);
    expect(r.accepted.map((f) => f.name)).toEqual(['1.pdf']);
    expect(r.rejected[0]).toMatchObject({ name: '2.pdf', reason: 'count' });
  });

  it('has no count limit when maxFiles is unset', () => {
    const open: DropRules = { extensions: ['.pdf'], kindLabel: 'PDFs' };
    const many = Array.from({ length: 80 }, (_, i) => file(`${i}.pdf`));
    expect(validateFiles(many, open).accepted).toHaveLength(80);
  });
});

describe('preset rules', () => {
  it('builds accept attributes', () => {
    expect(acceptAttr(PDF_RULES)).toBe('.pdf,application/pdf');
    expect(acceptAttr(IMAGE_RULES)).toContain('.heic');
  });
});

describe('single file rules', () => {
  const single = rulesFor({ kind: 'pdf', multiple: false });

  it('limits to one file and names it in the singular', () => {
    expect(single.maxFiles).toBe(1);
    expect(zoneNoun(single)).toBe('a PDF');
    expect(zoneNoun(rulesFor({ kind: 'image', multiple: true }))).toBe('images');
  });

  it('says why extra files were left out', () => {
    const r = validateFiles([file('a.pdf'), file('b.pdf')], single);
    expect(r.rejected[0]?.message).toBe(
      'b.pdf was left out. This tool works on one file at a time.',
    );
  });
});
