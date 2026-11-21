import { describe, expect, it } from 'vitest';
import { MEMORY_MESSAGE, UNREADABLE_MESSAGE, isOutOfMemory, unexpectedMessage } from './fail';

describe('unexpectedMessage', () => {
  it('names memory trouble plainly', () => {
    expect(isOutOfMemory(new RangeError('Array buffer allocation failed'))).toBe(true);
    expect(isOutOfMemory(new Error('Out of memory'))).toBe(true);
    expect(unexpectedMessage(new RangeError('x'), 'Oops.')).toBe(MEMORY_MESSAGE);
  });

  it('says when a picked file can no longer be read', () => {
    const err = new DOMException('changed', 'NotReadableError');
    expect(unexpectedMessage(err, 'Oops.')).toBe(UNREADABLE_MESSAGE);
  });

  it('falls back to the tool message for anything else', () => {
    expect(isOutOfMemory(new Error('bad xref'))).toBe(false);
    expect(unexpectedMessage(new Error('bad xref'), 'Oops.')).toBe('Oops.');
    expect(unexpectedMessage('weird', 'Oops.')).toBe('Oops.');
  });
});
