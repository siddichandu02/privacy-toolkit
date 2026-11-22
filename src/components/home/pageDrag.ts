import { createContext, useContext } from 'react';
import type { ToolInfo } from '../../tools';
import type { Sorted } from './suggest';

/** What a file being dragged over the page looks like, before it is dropped. */
export interface DragPeek {
  pdf: number;
  image: number;
  /** Files the browser will not name a type for yet (Safari, some HEIC). */
  unknown: number;
  /** Files no tool takes (Word, zip ...). */
  other: number;
}

export const isFileDrag = (e: DragEvent) =>
  Array.from(e.dataTransfer?.types ?? []).includes('Files');

/** Count the dragged files by kind. Browsers only share the MIME type until the drop. */
export function peekItems(items: DataTransferItemList | undefined | null): DragPeek {
  const out: DragPeek = { pdf: 0, image: 0, unknown: 0, other: 0 };
  for (const item of Array.from(items ?? [])) {
    if (item.kind !== 'file') continue;
    const type = item.type.toLowerCase();
    if (type === 'application/pdf') out.pdf += 1;
    else if (type.startsWith('image/')) out.image += 1;
    else if (type === '') out.unknown += 1;
    else out.other += 1;
  }
  return out;
}

/** Whether a tool card should light up for the file being dragged. */
export function canTake(tool: ToolInfo, peek: DragPeek): boolean {
  if (!tool.ready) return false;
  return peek[tool.input.kind] > 0 || peek.unknown > 0;
}

export interface PageDropValue {
  /** Set while a file is dragged anywhere over the page. */
  peek: DragPeek | null;
  /** Files dropped on the page (or picked in the hero), waiting for a tool. */
  sorted: Sorted | null;
  setSorted: (sorted: Sorted | null) => void;
}

export const PageDropContext = createContext<PageDropValue | null>(null);

export const usePageDrop = () => useContext(PageDropContext);
