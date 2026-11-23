import type { ComponentType } from 'react';
import type { ToolInfo } from '../tools';

export type Panel = ComponentType<{ tool: ToolInfo }>;

/**
 * Each tool's page code loads on its own, the first time it is opened (or
 * hovered on home), so the home page doesn't carry every tool.
 */
const loaders: Record<string, () => Promise<Panel>> = {
  merge: () => import('../components/merge/MergeTool').then((m) => m.MergeTool),
  split: () => import('../components/split/SplitTool').then((m) => m.SplitTool),
  rotate: () => import('../components/rotate/RotateTool').then((m) => m.RotateTool),
  'images-to-pdf': () => import('../components/images/ImagesTool').then((m) => m.ImagesTool),
  sign: () => import('../components/sign/SignTool').then((m) => m.SignTool),
  'compress-pdf': () => import('../components/compress/CompressTool').then((m) => m.CompressTool),
  'compress-image': () =>
    import('../components/compress-image/CompressImageTool').then((m) => m.CompressImageTool),
};
const workbench = () => import('../components/drop/ToolWorkbench').then((m) => m.ToolWorkbench);

export const loaderFor = (id: string) => loaders[id] ?? workbench;

/** Start fetching a tool's page code early, e.g. when its card is hovered. */
export function prefetchTool(id: string) {
  loaderFor(id)().catch(() => {
    // Opening the tool tries again and shows what went wrong.
  });
}
