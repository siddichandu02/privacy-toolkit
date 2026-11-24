import type { ResizeResult, ResizeSettings, ResizeStage } from '../lib/image/resize';
import type { PreparedRequest } from './usePreparedJob';
import type { WorkerReply } from './useWorkerJob';

export type ResizeWorkerRequest = PreparedRequest<ResizeSettings>;

export type ResizeDone = ResizeResult;

export type ResizeReply = WorkerReply<ResizeStage, ResizeDone>;
