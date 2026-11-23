import type { ResizeResult, ResizeSettings, ResizeStage } from '../lib/image/resize';
import type { WorkerReply } from './useWorkerJob';

export interface ResizeWorkerRequest {
  /** HEIC photos arrive already decoded on the page. */
  file: File;
  settings: ResizeSettings;
  /** Name and size of the file as picked. */
  originalName?: string;
  size?: number;
}

export type ResizeDone = ResizeResult;

export type ResizeReply = WorkerReply<ResizeStage, ResizeDone>;
