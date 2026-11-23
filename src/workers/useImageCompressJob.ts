import { useCallback } from 'react';
import type { CompressedImage, ImageCompressStage, SkippedImage } from '../lib/image/compress';
import type { ImageCompressDone, ImageCompressWorkerRequest } from './image-compress-protocol';
import { useWorkerJob, type WorkerFactory, type WorkerJob } from './useWorkerJob';

interface ImageCompressOutput {
  blob: Blob;
  name: string;
  items: CompressedImage[];
  skipped: SkippedImage[];
  before: number;
  after: number;
}

export type ImageCompressJob = WorkerJob<ImageCompressStage, ImageCompressOutput>;

export const imageCompressWorker: WorkerFactory = () =>
  new Worker(new URL('./image-compress.worker.ts', import.meta.url), {
    type: 'module',
    name: 'image-compress',
  });

const finish = ({ bytes, mime, ...rest }: ImageCompressDone): ImageCompressOutput => ({
  blob: new Blob([bytes as BlobPart], { type: mime }),
  ...rest,
});

/** Shrink photos in a Web Worker. */
export function useImageCompressJob(
  createWorker: WorkerFactory = imageCompressWorker,
  warm = false,
) {
  const { job, clock, start, reset } = useWorkerJob<
    ImageCompressWorkerRequest,
    ImageCompressStage,
    ImageCompressDone,
    ImageCompressOutput
  >({
    createWorker,
    warm,
    firstStage: 'reading',
    finish,
    crashMessage: 'Something went wrong while shrinking your photos. Try again.',
  });
  const compress = useCallback((request: ImageCompressWorkerRequest) => start(request), [start]);
  return { job: job as ImageCompressJob, clock, start: compress, reset };
}
