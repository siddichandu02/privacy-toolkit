import { describe, expect, it } from 'vitest';
import type { EncodeRequest, ImageEncoder } from './compress';
import { resizeImage, ResizeError, type ResizeSettings } from './resize';

const source = {
  name: 'beach.png',
  type: 'image/png',
  bytes: new Uint8Array(400).buffer,
  originalName: 'beach.HEIC',
  size: 900,
};

const settings: ResizeSettings = {
  width: 1080,
  height: 1350,
  crop: { x: 0.1, y: 0, width: 0.8, height: 1 },
  type: 'image/jpeg',
  quality: 0.92,
};

describe('resizeImage', () => {
  it('asks for the exact size and crop and names the result after the picked file', async () => {
    const seen: EncodeRequest[] = [];
    const encode: ImageEncoder = async (_s, req) => {
      seen.push(req);
      return {
        bytes: new Uint8Array(120),
        mime: req.type,
        width: req.size?.width ?? 0,
        height: req.size?.height ?? 0,
        sourceWidth: 3000,
        sourceHeight: 4000,
      };
    };
    const stages: string[] = [];
    const result = await resizeImage(source, settings, encode, (p) => stages.push(p.stage));

    expect(seen[0]).toMatchObject({
      type: 'image/jpeg',
      quality: 0.92,
      maxEdge: null,
      crop: settings.crop,
      size: { width: 1080, height: 1350 },
    });
    expect(result).toMatchObject({
      name: 'beach-1080x1350.jpg',
      mime: 'image/jpeg',
      width: 1080,
      height: 1350,
      sourceWidth: 3000,
      before: 900,
      after: 120,
    });
    expect(stages[0]).toBe('reading');
    expect(stages.at(-1)).toBe('packing');
  });

  it('keeps the whole photo when there is no crop', async () => {
    let crop: unknown = 'unset';
    const encode: ImageEncoder = async (_s, req) => {
      crop = req.crop;
      return {
        bytes: new Uint8Array(1),
        mime: 'image/png',
        width: 10,
        height: 10,
        sourceWidth: 10,
        sourceHeight: 10,
      };
    };
    await resizeImage(source, { ...settings, crop: null }, encode);
    expect(crop).toBeUndefined();
  });

  it('names the file that could not be opened', async () => {
    const encode: ImageEncoder = async () => {
      throw new Error('decode');
    };
    const err = await resizeImage(source, settings, encode).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ResizeError);
    expect(err).toMatchObject({ fileName: 'beach.HEIC' });
  });

  it('refuses a size of zero', async () => {
    const encode: ImageEncoder = async () => {
      throw new Error('not called');
    };
    await expect(resizeImage(source, { ...settings, width: 0 }, encode)).rejects.toThrow(
      'at least 1 pixel',
    );
  });
});
