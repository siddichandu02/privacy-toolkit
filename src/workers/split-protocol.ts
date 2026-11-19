import type { PageRange } from '../lib/pdf/ranges';
import type { SplitMode, SplitResult, SplitStage } from '../lib/pdf/split';
import type { WorkerReply } from './useWorkerJob';

export interface SplitWorkerRequest {
  file: File;
  ranges: PageRange[];
  mode: SplitMode;
}

/** The result without `type`, which would clash with the message type. */
export type SplitDone = Pick<SplitResult, 'bytes' | 'name' | 'files' | 'pages'> & {
  mime: SplitResult['type'];
};

export type SplitReply = WorkerReply<SplitStage, SplitDone>;
