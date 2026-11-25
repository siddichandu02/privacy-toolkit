import type { ImagesOptions, ImagesResult, ImagesStage } from '../lib/pdf/images';
import type { PreparedRequest } from './usePreparedJob';
import type { WorkerReply } from './useWorkerJob';

/** Images in page order; HEIC photos come already decoded. `settings` is the page layout. */
export type ImagesWorkerRequest = PreparedRequest<ImagesOptions>;

export type ImagesDone = ImagesResult;

export type ImagesReply = WorkerReply<ImagesStage, ImagesDone>;
