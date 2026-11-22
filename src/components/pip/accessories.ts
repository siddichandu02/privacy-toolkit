/** Props Pip can show off, one per tool (see `accessoryFor`). */
export type PipAccessory =
  | 'chef-hat'
  | 'knife'
  | 'dough'
  | 'camera'
  | 'quill'
  | 'suitcase'
  | 'magnifier'
  | 'bubbles'
  | 'scissors'
  | 'sunglasses';

const ACCESSORIES: Record<string, PipAccessory> = {
  merge: 'chef-hat',
  split: 'knife',
  rotate: 'dough',
  'images-to-pdf': 'camera',
  sign: 'quill',
  'compress-pdf': 'suitcase',
  'compress-image': 'magnifier',
  convert: 'bubbles',
  resize: 'scissors',
  exif: 'sunglasses',
};

/** What Pip shows off while a tool's card is hovered. */
export function accessoryFor(toolId: string | null | undefined): PipAccessory | null {
  return (toolId && ACCESSORIES[toolId]) || null;
}
