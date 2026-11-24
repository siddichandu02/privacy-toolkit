import { GROUP_ORDER, type DetailGroup, type PhotoDetails } from '../../lib/image/exif-details';

const PHRASE: Record<DetailGroup, string> = {
  location: 'where it was taken',
  when: 'when',
  owner: 'whose it is',
  camera: 'which camera or phone took it',
  settings: 'the camera settings',
  software: 'which apps edited it',
};

function list(words: string[]): string {
  if (words.length <= 1) return words.join('');
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

/** "Anyone who gets this photo can see where it was taken, when and which camera took it." */
export function singleLine(d: PhotoDetails | undefined): string {
  const groups = d ? GROUP_ORDER.filter((g) => d.groups[g] && g !== 'settings') : [];
  if (!groups.length) {
    return d?.groups.settings || d?.total
      ? 'Only technical details are hidden in this photo. You can still save a clean copy.'
      : 'Nothing personal is hidden in this photo. You can still save a clean copy.';
  }
  return `Anyone who gets this photo can see ${list(groups.slice(0, 3).map((g) => PHRASE[g]))}.`;
}

export function batchLine(count: number, withPlace: number, withAny: number): string {
  if (withPlace === count) return `All ${count} photos show where they were taken.`;
  if (withPlace > 0) return `${withPlace} of ${count} photos show where they were taken.`;
  if (withAny > 0)
    return `${withAny} of ${count} photos carry hidden details about the camera or the date.`;
  return `Nothing personal is hidden in these ${count} photos. You can still save clean copies.`;
}
