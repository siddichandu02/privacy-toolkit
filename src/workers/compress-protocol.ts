import type { CompressLevel, CompressResult, CompressStage } from '../lib/pdf/compress';
import type { WorkerReply } from './useWorkerJob';

export interface CompressWorkerRequest {
  file: File;
  level: CompressLevel;
}

export type CompressDone = CompressResult;

export type CompressReply = WorkerReply<CompressStage, CompressDone>;
