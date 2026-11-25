import type {
  Encoded,
  ImageCompressResult,
  ImageCompressSettings,
  ImageCompressStage,
} from '../lib/image/compress';
import type { PreparedRequest } from './usePreparedJob';
import type { WorkerReply } from './useWorkerJob';

/** Compress every file and hand back one photo or a ZIP. HEIC photos come decoded. */
export interface ImageCompressWorkerRequest extends PreparedRequest<ImageCompressSettings> {
  kind?: 'run';
}

/** Re-save one photo so the page can show it next to the original. */
export interface ImagePreviewRequest {
  kind: 'preview';
  id: number;
  file: File;
  settings: ImageCompressSettings;
  /** What the photo was before the page decoded it (HEIC), when that differs from `file.type`. */
  sourceType?: string;
}

export type ImageCompressDone = ImageCompressResult;

export type ImageCompressReply = WorkerReply<ImageCompressStage, ImageCompressDone>;

export type ImagePreviewReply =
  ({ type: 'preview'; id: number } & Encoded) | { type: 'preview-error'; id: number };
