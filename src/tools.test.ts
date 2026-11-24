import { TOOLS, filterTools, getTool, matchScore, rankTools, toolPath } from './tools';

describe('TOOLS registry', () => {
  it('has unique, URL-safe ids', () => {
    const ids = TOOLS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  it('covers both PDF and image categories', () => {
    const categories = new Set(TOOLS.map((t) => t.category));
    expect(categories).toEqual(new Set(['pdf', 'image']));
  });
});

describe('getTool', () => {
  it('finds a tool by id', () => {
    expect(getTool('merge')?.name).toBe('Merge PDF');
  });

  it('returns undefined for unknown or missing ids', () => {
    expect(getTool('nope')).toBeUndefined();
    expect(getTool(undefined)).toBeUndefined();
  });

  it('builds tool paths', () => {
    expect(toolPath('split')).toBe('/tools/split');
  });
});

describe('filterTools', () => {
  const ids = (list: readonly { id: string }[]) => list.map((t) => t.id);

  it('returns every tool for "all" and an empty query', () => {
    expect(filterTools(TOOLS, 'all', '')).toHaveLength(TOOLS.length);
  });

  it('filters by category', () => {
    const images = filterTools(TOOLS, 'image', '');
    expect(images.length).toBeGreaterThan(0);
    expect(images.every((t) => t.category === 'image')).toBe(true);
  });

  it('matches name and blurb, ignoring case and extra spaces', () => {
    expect(ids(filterTools(TOOLS, 'all', '  MERGE '))).toEqual(['merge']);
    expect(ids(filterTools(TOOLS, 'all', 'heic'))).toEqual(['convert']);
  });

  it('needs every word but not in order', () => {
    expect(ids(filterTools(TOOLS, 'all', 'pdf compress'))).toEqual(['compress-pdf']);
  });

  it('combines category and query', () => {
    expect(filterTools(TOOLS, 'pdf', 'photo').every((t) => t.category === 'pdf')).toBe(true);
    expect(ids(filterTools(TOOLS, 'image', 'merge'))).toEqual([]);
  });

  it('ignores accents in the query', () => {
    expect(ids(filterTools(TOOLS, 'all', 'résize'))).toEqual(['resize']);
  });

  it('matches extra search words', () => {
    expect(ids(filterTools(TOOLS, 'all', 'passport'))).toEqual(['resize']);
    expect(ids(filterTools(TOOLS, 'all', 'gps'))).toEqual(['exif']);
  });
});

describe('rankTools', () => {
  const ids = (list: readonly { id: string }[]) => list.map((t) => t.id);

  it('keeps registry order for an empty query', () => {
    expect(ids(rankTools(TOOLS, ''))).toEqual(ids(TOOLS));
  });

  it('puts name matches before keyword and blurb matches', () => {
    // "Images to PDF" starts with "im"; "Compress image" has a name word; the rest is blurb.
    const found = ids(rankTools(TOOLS, 'im'));
    expect(found[0]).toBe('images-to-pdf');
    expect(found[1]).toBe('compress-image');
  });

  it('finds tools by keyword prefix', () => {
    expect(ids(rankTools(TOOLS, 'joi'))).toEqual(['merge']);
    expect(ids(rankTools(TOOLS, 'insta'))).toEqual(['resize']);
  });

  it('needs every word to hit', () => {
    expect(rankTools(TOOLS, 'merge teleport')).toEqual([]);
    expect(ids(rankTools(TOOLS, 'compress pdf'))[0]).toBe('compress-pdf');
  });

  it('scores zero for no match', () => {
    const merge = TOOLS[0];
    if (!merge) throw new Error('no tools');
    expect(matchScore(merge, 'zebra')).toBe(0);
  });
});
