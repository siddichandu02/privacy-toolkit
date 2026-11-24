import type { CleanResult, CleanStage } from '../lib/image/exif-clean';
import type { PreparedRequest } from './usePreparedJob';
import type { WorkerReply } from './useWorkerJob';

/** Nothing to set: every detail goes. */
export type ExifWorkerRequest = PreparedRequest<null>;

export type ExifDone = CleanResult;

export type ExifReply = WorkerReply<CleanStage, ExifDone>;
