import { TOOLS } from './tools';

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
