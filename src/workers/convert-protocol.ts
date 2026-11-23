import type { ConvertResult, ConvertSettings, ConvertStage } from '../lib/image/convert';
import type { WorkerReply } from './useWorkerJob';

export interface ConvertWorkerRequest {
  /** HEIC photos already decoded to PNG on the page, under their own names. */
  files: File[];
  settings: ConvertSettings;
  /** Sizes of the files as picked, in the same order. */
  sizes?: number[];
  /** Positions of HEIC photos the page could not decode; they are left out and named. */
  undecoded?: number[];
}

export type ConvertDone = ConvertResult;

export type ConvertReply = WorkerReply<ConvertStage, ConvertDone>;
