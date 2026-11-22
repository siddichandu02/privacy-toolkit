import { describe, expect, it } from 'vitest';
import { TOOLS } from '../tools';
import { distance, nearTools } from './nearTools';

const ids = (path: string) => nearTools(path, TOOLS).map((t) => t.id);

describe('distance', () => {
  it('counts single letter changes', () => {
    expect(distance('merge', 'merge')).toBe(0);
    expect(distance('merg', 'merge')).toBe(1);
    expect(distance('spilt', 'split')).toBe(1);
    expect(distance('splti', 'split')).toBe(1);
    expect(distance('', 'abc')).toBe(3);
  });
});

describe('nearTools', () => {
  it('finds the tool behind a typo', () => {
    expect(ids('/tools/merg')[0]).toBe('merge');
    expect(ids('/tools/spilt')[0]).toBe('split');
    expect(ids('/tools/rotat')[0]).toBe('rotate');
  });

  it('finds every tool that shares a word', () => {
    expect(ids('/compres')).toEqual(expect.arrayContaining(['compress-pdf', 'compress-image']));
  });

  it('stays quiet when nothing is close', () => {
    expect(ids('/tools/teleport')).toEqual([]);
    expect(ids('/this/does/not/exist')).toEqual([]);
    expect(ids('/')).toEqual([]);
  });

  it('never offers more than asked', () => {
    expect(nearTools('/pdf-image-compress-merge-split', TOOLS, 2).length).toBeLessThanOrEqual(2);
  });
});
