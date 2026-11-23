import { useEffect, useRef, useState } from 'react';
import type { ImageCompressSettings } from '../lib/image/compress-names';
import type { ImagePreviewReply, ImagePreviewRequest } from './image-compress-protocol';
import { imageCompressWorker } from './useImageCompressJob';
import type { WorkerFactory } from './useWorkerJob';

export interface ImagePreview {
  /** Object URL of the re-saved photo, or null until the first one is ready. */
  url: string | null;
  bytes: number;
  type: string;
  width: number;
  height: number;
}

export interface ImagePreviewState {
  preview: ImagePreview | null;
  /** A newer version is being made; the shown one is for older settings. */
  busy: boolean;
  /** The photo could not be opened in this browser. */
  failed: boolean;
}

/** Wait this long after the last change before re-saving, so dragging the slider stays smooth. */
export const PREVIEW_DEBOUNCE_MS = 180;

const fileKey = (f: File) => `${f.name}:${f.size}:${f.lastModified}`;

interface Answer {
  /** Which photo and settings this answer is for. */
  file: string;
  settings: string;
  preview: ImagePreview | null;
  failed: boolean;
}

/**
 * Re-saves one photo with the current settings in a worker and keeps the
 * result as an object URL, so the page can show the real outcome (and its
 * real size) next to the original. Only the latest request counts.
 */
export function useImagePreview(
  file: File | undefined,
  settings: ImageCompressSettings,
  createWorker: WorkerFactory = imageCompressWorker,
): ImagePreviewState {
  const [answer, setAnswer] = useState<Answer | null>(null);
  const worker = useRef<Worker | null>(null);
  const latest = useRef(0);
  const shownUrl = useRef<string | null>(null);

  const { quality, format, maxEdge } = settings;
  const fKey = file ? fileKey(file) : '';
  const sKey = `${quality}|${format}|${maxEdge}`;

  // One worker per photo, made on the first request and closed when the photo changes.
  useEffect(() => {
    return () => {
      worker.current?.terminate();
      worker.current = null;
      latest.current += 1;
    };
  }, [file, createWorker]);

  // Let go of the last picture when the page goes away.
  useEffect(
    () => () => {
      if (shownUrl.current) URL.revokeObjectURL(shownUrl.current);
      shownUrl.current = null;
    },
    [],
  );

  useEffect(() => {
    if (!file) return;
    const forFile = fileKey(file);
    const forSettings = `${quality}|${format}|${maxEdge}`;
    const timer = setTimeout(() => {
      const id = ++latest.current;
      const fail = () =>
        setAnswer((a) => ({
          file: forFile,
          settings: forSettings,
          preview: a?.file === forFile ? a.preview : null,
          failed: true,
        }));
      let w = worker.current;
      if (!w) {
        try {
          w = createWorker();
        } catch {
          fail();
          return;
        }
        worker.current = w;
      }
      w.onmessage = (event: MessageEvent<ImagePreviewReply>) => {
        const msg = event.data;
        if (msg.id !== latest.current) return;
        if (msg.type === 'preview-error') {
          fail();
          return;
        }
        const url = URL.createObjectURL(new Blob([msg.bytes as BlobPart], { type: msg.mime }));
        if (shownUrl.current) URL.revokeObjectURL(shownUrl.current);
        shownUrl.current = url;
        setAnswer({
          file: forFile,
          settings: forSettings,
          preview: {
            url,
            bytes: msg.bytes.byteLength,
            type: msg.mime,
            width: msg.width,
            height: msg.height,
          },
          failed: false,
        });
      };
      w.onerror = (event) => {
        event.preventDefault();
        if (id === latest.current) fail();
      };
      const request: ImagePreviewRequest = {
        kind: 'preview',
        id,
        file,
        settings: { quality, format, maxEdge },
      };
      w.postMessage(request);
    }, PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [file, quality, format, maxEdge, createWorker]);

  const mine = file && answer?.file === fKey ? answer : null;
  return {
    preview: mine?.preview ?? null,
    failed: !!mine?.failed,
    busy: !!file && (!mine || (mine.settings !== sKey && !mine.failed)),
  };
}
