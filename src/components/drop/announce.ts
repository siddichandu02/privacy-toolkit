/**
 * What a screen reader hears when files join the list, e.g. "a.pdf added. 3 PDFs
 * in the list." Several at once are counted rather than read out one by one.
 */
export function addedMessage(names: readonly string[], total: number, noun = 'files') {
  if (names.length === 0) return '';
  const what = names.length === 1 ? `${names[0]} added.` : `${names.length} ${noun} added.`;
  const one = noun.replace(/s$/, '');
  return `${what} ${total} ${total === 1 ? one : noun} in the list.`;
}
