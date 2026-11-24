import type { SkippedImage } from '../lib/image/compress';
import { prepareImages } from '../lib/image/heic';
import type { ResizedImage, ResizeSettings, ResizeStage } from '../lib/image/resize';
import type { ResizeDone } from './resize-protocol';
import { usePreparedJob, type Prepare } from './usePreparedJob';
import type { WorkerFactory, WorkerJob } from './useWorkerJob';

interface ResizeOutput {
  blob: Blob;
  name: string;
  items: ResizedImage[];
  skipped: SkippedImage[];
}

export type ResizeJob = WorkerJob<ResizeStage, ResizeOutput>;

export const resizeWorker: WorkerFactory = () =>
  new Worker(new URL('./resize.worker.ts', import.meta.url), { type: 'module', name: 'resize' });

const finish = ({ bytes, mime, ...rest }: ResizeDone): ResizeOutput => ({
  blob: new Blob([bytes as BlobPart], { type: mime }),
  ...rest,
});

/** Cut or fit photos in a Web Worker, opening HEIC photos on the page first. */
export function useResizeJob(
  createWorker: WorkerFactory = resizeWorker,
  warm = false,
  prepare: Prepare = prepareImages,
) {
  return usePreparedJob<ResizeSettings, ResizeDone, ResizeOutput>({
    createWorker,
    warm,
    prepare,
    finish,
    crashMessage: 'Something went wrong while resizing your photos. Try again.',
  });
}
