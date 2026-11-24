import type { SkippedImage } from '../lib/image/compress';
import type { ConvertedImage, ConvertSettings, ConvertStage } from '../lib/image/convert';
import { prepareImages } from '../lib/image/heic';
import type { ConvertDone } from './convert-protocol';
import { usePreparedJob, type Prepare } from './usePreparedJob';
import type { WorkerFactory, WorkerJob } from './useWorkerJob';

interface ConvertOutput {
  blob: Blob;
  name: string;
  items: ConvertedImage[];
  skipped: SkippedImage[];
  fellBack: boolean;
}

export type ConvertJob = WorkerJob<ConvertStage, ConvertOutput>;

export const convertWorker: WorkerFactory = () =>
  new Worker(new URL('./convert.worker.ts', import.meta.url), {
    type: 'module',
    name: 'convert',
  });

const finish = ({ bytes, mime, ...rest }: ConvertDone): ConvertOutput => ({
  blob: new Blob([bytes as BlobPart], { type: mime }),
  ...rest,
});

/** Convert photos in a Web Worker, decoding HEIC on the page first. */
export function useConvertJob(
  createWorker: WorkerFactory = convertWorker,
  warm = false,
  prepare: Prepare = prepareImages,
) {
  return usePreparedJob<ConvertSettings, ConvertDone, ConvertOutput>({
    createWorker,
    warm,
    prepare,
    finish,
    crashMessage: 'Something went wrong while converting your photos. Try again.',
  });
}
