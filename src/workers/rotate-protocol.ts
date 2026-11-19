import type { PageEdit, RotateResult, RotateStage } from '../lib/pdf/rotate';
import type { WorkerReply } from './useWorkerJob';

export interface RotateWorkerRequest {
  file: File;
  edits: PageEdit[];
}

export type RotateDone = RotateResult;

export type RotateReply = WorkerReply<RotateStage, RotateDone>;
