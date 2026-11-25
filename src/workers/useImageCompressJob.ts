import type { CompressedImage, ImageCompressStage, SkippedImage } from '../lib/image/compress';
import type { ImageCompressSettings } from '../lib/image/compress-names';
import { prepareImages } from '../lib/image/heic';
import type { ImageCompressDone } from './image-compress-protocol';
import { usePreparedJob, type Prepare } from './usePreparedJob';
import type { WorkerFactory, WorkerJob } from './useWorkerJob';

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

/** Shrink photos in a Web Worker, opening HEIC photos on the page first. */
export function useImageCompressJob(
  createWorker: WorkerFactory = imageCompressWorker,
  warm = false,
  prepare: Prepare = prepareImages,
) {
  return usePreparedJob<ImageCompressSettings, ImageCompressDone, ImageCompressOutput>({
    createWorker,
    warm,
    prepare,
    finish,
    crashMessage: 'Something went wrong while shrinking your photos. Try again.',
  });
}
