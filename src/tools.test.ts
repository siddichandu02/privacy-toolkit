import { TOOLS, getTool, toolPath } from './tools';

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
