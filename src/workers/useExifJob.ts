import { useCallback } from 'react';
import type { SkippedImage } from '../lib/image/compress';
import type { CleanedImage, CleanStage } from '../lib/image/exif-clean';
import { prepareImages } from '../lib/image/heic';
import type { ExifDone } from './exif-protocol';
import { usePreparedJob, type Prepare } from './usePreparedJob';
import type { WorkerFactory, WorkerJob } from './useWorkerJob';

interface ExifOutput {
  blob: Blob;
  name: string;
  items: CleanedImage[];
  skipped: SkippedImage[];
}

export type ExifJob = WorkerJob<CleanStage, ExifOutput>;

export const exifWorker: WorkerFactory = () =>
  new Worker(new URL('./exif.worker.ts', import.meta.url), { type: 'module', name: 'exif' });

const finish = ({ bytes, mime, ...rest }: ExifDone): ExifOutput => ({
  blob: new Blob([bytes as BlobPart], { type: mime }),
  ...rest,
});

/** Remove hidden details from photos in a Web Worker, decoding HEIC on the page first. */
export function useExifJob(
  createWorker: WorkerFactory = exifWorker,
  warm = false,
  prepare: Prepare = prepareImages,
) {
  const job = usePreparedJob<null, ExifDone, ExifOutput>({
    createWorker,
    warm,
    prepare,
    finish,
    crashMessage: 'Something went wrong while cleaning your photos. Try again.',
  });
  const { start } = job;
  const clean = useCallback((files: File[]) => start(files, null), [start]);
  return { ...job, start: clean };
}
