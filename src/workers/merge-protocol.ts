import type { MergeStage } from '../lib/pdf/merge';

export interface MergeRequest {
  files: File[];
}

export type MergeReply =
  | { type: 'progress'; stage: MergeStage; progress: number }
  | { type: 'done'; bytes: Uint8Array }
  | { type: 'error'; message: string; fileName?: string };
