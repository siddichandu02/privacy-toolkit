import type { ImagesOptions, ImagesResult, ImagesStage } from '../lib/pdf/images';
import type { WorkerReply } from './useWorkerJob';

export interface ImagesWorkerRequest {
  files: File[];
  options: ImagesOptions;
}

export type ImagesDone = ImagesResult;

export type ImagesReply = WorkerReply<ImagesStage, ImagesDone>;
