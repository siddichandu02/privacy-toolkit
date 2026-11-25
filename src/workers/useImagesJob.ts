import { prepareImages } from '../lib/image/heic';
import type { ImagesOptions, ImagesStage } from '../lib/pdf/images';
import type { ImagesDone } from './images-protocol';
import { usePreparedJob, type Prepare } from './usePreparedJob';
import type { WorkerFactory, WorkerJob } from './useWorkerJob';

interface ImagesOutput {
  blob: Blob;
  name: string;
  pages: number;
}

export type ImagesJob = WorkerJob<ImagesStage, ImagesOutput>;

const defaultFactory: WorkerFactory = () =>
  new Worker(new URL('./images.worker.ts', import.meta.url), { type: 'module', name: 'images' });

const finish = ({ bytes, name, pages }: ImagesDone): ImagesOutput => ({
  blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }),
  name,
  pages,
});

/** Turn images into one PDF in a Web Worker, opening HEIC photos on the page first. */
export function useImagesJob(
  createWorker: WorkerFactory = defaultFactory,
  warm = false,
  prepare: Prepare = prepareImages,
) {
  return usePreparedJob<ImagesOptions, ImagesDone, ImagesOutput>({
    createWorker,
    warm,
    prepare,
    finish,
    crashMessage: 'Something went wrong while making your PDF. Try again.',
  });
}
