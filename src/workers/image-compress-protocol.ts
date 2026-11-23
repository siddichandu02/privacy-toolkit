import type {
  Encoded,
  ImageCompressResult,
  ImageCompressSettings,
  ImageCompressStage,
} from '../lib/image/compress';
import type { WorkerReply } from './useWorkerJob';

/** Compress every file and hand back one photo or a ZIP. */
export interface ImageCompressWorkerRequest {
  kind?: 'run';
  files: File[];
  settings: ImageCompressSettings;
}

/** Re-save one photo so the page can show it next to the original. */
export interface ImagePreviewRequest {
  kind: 'preview';
  id: number;
  file: File;
  settings: ImageCompressSettings;
}

export type ImageCompressDone = ImageCompressResult;

export type ImageCompressReply = WorkerReply<ImageCompressStage, ImageCompressDone>;

export type ImagePreviewReply =
  ({ type: 'preview'; id: number } & Encoded) | { type: 'preview-error'; id: number };
