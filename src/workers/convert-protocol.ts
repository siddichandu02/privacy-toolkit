import type { ConvertResult, ConvertSettings, ConvertStage } from '../lib/image/convert';
import type { PreparedRequest } from './usePreparedJob';
import type { WorkerReply } from './useWorkerJob';

export type ConvertWorkerRequest = PreparedRequest<ConvertSettings>;

export type ConvertDone = ConvertResult;

export type ConvertReply = WorkerReply<ConvertStage, ConvertDone>;
