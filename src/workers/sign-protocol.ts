import type { Placement, SignResult, SignStage } from '../lib/pdf/sign';
import type { WorkerReply } from './useWorkerJob';

export interface SignWorkerRequest {
  file: File;
  /** The signature as a transparent PNG. */
  signature: Blob;
  /** Signature height divided by width. */
  aspect: number;
  place: Placement;
  /** Pages to sign, 0-based. */
  pages: number[];
}

export type SignDone = SignResult;

export type SignReply = WorkerReply<SignStage, SignDone>;
