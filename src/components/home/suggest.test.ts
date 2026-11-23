import { describe, expect, it } from 'vitest';
import { sortFiles, suggestTools } from './suggest';

const pdf = (name: string) => new File(['%PDF'], name, { type: 'application/pdf' });
const jpg = (name: string) => new File(['x'], name, { type: 'image/jpeg' });

describe('sortFiles', () => {
  it('splits PDFs, images and the rest', () => {
    const s = sortFiles([pdf('a.pdf'), jpg('b.jpg'), new File(['x'], 'c.txt'), pdf('d.PDF')]);
    expect(s.pdf.map((f) => f.name)).toEqual(['a.pdf', 'd.PDF']);
    expect(s.image.map((f) => f.name)).toEqual(['b.jpg']);
    expect(s.other.map((f) => f.name)).toEqual(['c.txt']);
  });
});

describe('suggestTools', () => {
  const ids = (files: File[]) => suggestTools(sortFiles(files)).map((t) => t.id);

  it('leads with compress for one PDF and merge for several', () => {
    expect(ids([pdf('a.pdf')])[0]).toBe('compress-pdf');
    expect(ids([pdf('a.pdf'), pdf('b.pdf')])[0]).toBe('merge');
  });

  it('offers images to PDF for photos and only working tools', () => {
    const list = suggestTools(sortFiles([jpg('a.jpg')]));
    expect(list[0]?.id).toBe('images-to-pdf');
    expect(list.every((t) => t.ready && t.input.kind === 'image')).toBe(true);
  });

  it('leads with convert when every photo is HEIC', () => {
    const heic = new File(['x'], 'IMG_1.HEIC');
    expect(ids([heic])[0]).toBe('convert');
    expect(ids([heic, jpg('b.jpg')])[0]).toBe('images-to-pdf');
  });

  it('offers both kinds for a mixed drop and nothing for unknown files', () => {
    const mixed = ids([pdf('a.pdf'), jpg('b.jpg')]);
    expect(mixed).toContain('merge');
    expect(mixed).toContain('images-to-pdf');
    expect(ids([new File(['x'], 'a.zip')])).toEqual([]);
  });
});
