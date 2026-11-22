import { describe, expect, it } from 'vitest';
import { TOOLS } from '../../tools';
import { canTake, peekItems } from './pageDrag';

const items = (...types: string[]) =>
  types.map((type) => ({ kind: 'file', type })) as unknown as DataTransferItemList;

const tool = (id: string) => {
  const t = TOOLS.find((x) => x.id === id);
  if (!t) throw new Error(id);
  return t;
};

describe('peekItems', () => {
  it('counts dragged files by kind', () => {
    expect(
      peekItems(items('application/pdf', 'application/pdf', 'image/png', '', 'text/plain')),
    ).toEqual({
      pdf: 2,
      image: 1,
      unknown: 1,
      other: 1,
    });
  });

  it('ignores dragged text and handles no items', () => {
    const text = [{ kind: 'string', type: 'text/plain' }] as unknown as DataTransferItemList;
    expect(peekItems(text)).toEqual({ pdf: 0, image: 0, unknown: 0, other: 0 });
    expect(peekItems(null)).toEqual({ pdf: 0, image: 0, unknown: 0, other: 0 });
  });
});

describe('canTake', () => {
  const none = { pdf: 0, image: 0, unknown: 0, other: 0 };

  it('lights up tools for the dragged kind only', () => {
    expect(canTake(tool('merge'), { ...none, pdf: 1 })).toBe(true);
    expect(canTake(tool('images-to-pdf'), { ...none, pdf: 1 })).toBe(false);
    expect(canTake(tool('images-to-pdf'), { ...none, image: 2 })).toBe(true);
  });

  it('gives files of unknown type the benefit of the doubt', () => {
    expect(canTake(tool('split'), { ...none, unknown: 1 })).toBe(true);
  });

  it('never lights up tools that are not ready', () => {
    const soon = TOOLS.find((t) => !t.ready);
    if (soon) expect(canTake(soon, { ...none, pdf: 3, image: 3, unknown: 3 })).toBe(false);
  });

  it('lights nothing for files no tool takes', () => {
    expect(canTake(tool('merge'), { ...none, other: 1 })).toBe(false);
  });
});
