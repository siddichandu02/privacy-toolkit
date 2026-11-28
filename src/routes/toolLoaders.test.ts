import { describe, expect, it } from 'vitest';
import { toolInHash } from './toolLoaders';

describe('toolInHash', () => {
  it('finds the tool a link opens', () => {
    expect(toolInHash('#/tools/merge')).toBe('merge');
    expect(toolInHash('#/tools/compress-image/')).toBe('compress-image');
    expect(toolInHash('#/tools/split?from=home')).toBe('split');
  });

  it('ignores home, other pages and unknown tools', () => {
    expect(toolInHash('')).toBeNull();
    expect(toolInHash('#/')).toBeNull();
    expect(toolInHash('#/lab/pip')).toBeNull();
    expect(toolInHash('#/tools/teleport')).toBeNull();
    expect(toolInHash('#/tools/constructor')).toBeNull();
    expect(toolInHash('#/tools/merge/extra')).toBeNull();
  });
});
