import { describe, expect, it } from 'vitest';
import { exifBlock, makeExifJpeg, makeExifPng, makeJpeg, makePng } from '../../test/make-image';
import { readPhotoDetails } from './exif-read';
import {
  jpegOrientation,
  stripImage,
  stripJpeg,
  stripKind,
  stripPng,
  stripWebp,
  StripError,
} from './exif-strip';

const FULL = {
  make: 'Apple',
  model: 'iPhone 15 Pro',
  software: 'Photos',
  artist: 'Sam Rivera',
  taken: '2024:07:14 18:22:05',
  serial: 'F2LX81234',
  gps: { lat: 48.85837, lon: 2.294481 },
};

/** The 1x1 fixture stops after its picture data; real files end with EOI. */
const jpeg = () => Uint8Array.from([...makeJpeg(), 0xff, 0xd9]);

const text = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));

function segment(marker: number, body: Uint8Array) {
  const len = body.length + 2;
  return Uint8Array.from([0xff, marker, len >>> 8, len & 255, ...body]);
}

/** Put extra segments right after the SOI of a JPEG. */
function withSegments(jpeg: Uint8Array, ...segments: Uint8Array[]) {
  const parts = [jpeg.subarray(0, 2), ...segments, jpeg.subarray(2)];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** The picture data of a JPEG: everything from the first SOS to EOI. */
function scanData(jpeg: Uint8Array) {
  for (let i = 2; i < jpeg.length - 1; i++) {
    if (jpeg[i] === 0xff && jpeg[i + 1] === 0xda) return jpeg.subarray(i);
  }
  throw new Error('no SOS');
}

describe('stripJpeg', () => {
  it('leaves nothing for a reader to find', async () => {
    const before = await readPhotoDetails(makeExifJpeg(FULL));
    expect(before.location).not.toBeNull();
    const after = await readPhotoDetails(stripJpeg(makeExifJpeg(FULL)));
    expect(after.location).toBeNull();
    expect(after.groups).toEqual({});
  });

  it('copies the picture data byte for byte', () => {
    const original = jpeg();
    const out = stripJpeg(makeExifJpeg(FULL, original));
    expect(scanData(out)).toEqual(scanData(original));
    expect(out).toEqual(original);
  });

  it('keeps only the turn of a turned photo, after JFIF', async () => {
    const out = stripJpeg(makeExifJpeg({ ...FULL, orientation: 6 }));
    expect(jpegOrientation(out)).toBe(6);
    // JFIF APP0 comes first, then the turn.
    expect([out[2], out[3]]).toEqual([0xff, 0xe0]);
    const details = await readPhotoDetails(out);
    expect(details.orientation).toBe(6);
    expect(details.groups).toEqual({});
  });

  it('drops comments, XMP, IPTC and MPF but keeps the colour profile and Adobe flag', () => {
    const icc = segment(0xe2, text('ICC_PROFILE\0\x01\x01profile'));
    const adobe = segment(0xee, text('Adobe\0d\0\0\0\0\x01'));
    const input = withSegments(
      jpeg(),
      segment(0xe1, text('http://ns.adobe.com/xap/1.0/\0<x:xmpmeta>GPS</x:xmpmeta>')),
      segment(0xed, text('Photoshop 3.0\x008BIM caption')),
      segment(0xe2, text('MPF\0data')),
      segment(0xfe, text('shot by Sam')),
      icc,
      adobe,
    );
    const out = stripJpeg(input);
    const str = String.fromCharCode(...out);
    expect(str).not.toContain('xmpmeta');
    expect(str).not.toContain('8BIM');
    expect(str).not.toContain('MPF');
    expect(str).not.toContain('shot by Sam');
    expect(str).toContain('ICC_PROFILE');
    expect(str).toContain('Adobe');
  });

  it('leaves trailing pictures and junk after the end marker behind', () => {
    const original = jpeg();
    const out = stripJpeg(Uint8Array.from([...original, ...text('hidden thumbnail')]));
    expect(out).toEqual(original);
  });

  it('adds the end marker when a file stops short', () => {
    const out = stripJpeg(makeExifJpeg(FULL));
    expect([...out.subarray(-2)]).toEqual([0xff, 0xd9]);
  });

  it('handles several scans and restart markers', () => {
    // A made up stream: SOS, data with a stuffed FF00 and an RST, a DHT, a second SOS.
    const sos = segment(0xda, Uint8Array.from([1, 1, 0, 0, 63, 0]));
    const dht = segment(0xc4, Uint8Array.from([0, ...new Array(16).fill(0)]));
    const input = Uint8Array.from([
      0xff,
      0xd8,
      ...segment(0xe1, exifBlock(FULL)),
      ...sos,
      0x12,
      0xff,
      0x00,
      0x34,
      0xff,
      0xd3,
      0x56,
      ...dht,
      ...sos,
      0x78,
      0xff,
      0xd9,
    ]);
    const out = stripJpeg(input);
    const expected = Uint8Array.from([
      0xff,
      0xd8,
      ...sos,
      0x12,
      0xff,
      0x00,
      0x34,
      0xff,
      0xd3,
      0x56,
      ...dht,
      ...sos,
      0x78,
      0xff,
      0xd9,
    ]);
    expect(out).toEqual(expected);
  });

  it('refuses broken files', () => {
    expect(() => stripJpeg(Uint8Array.from([0xff, 0xd8, 0x00, 0x11]))).toThrow(StripError);
    expect(() => stripJpeg(Uint8Array.from([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff]))).toThrow(
      StripError,
    );
  });
});

describe('stripPng', () => {
  it('drops eXIf and text chunks and keeps the picture', async () => {
    const input = makeExifPng(FULL);
    expect((await readPhotoDetails(input)).location).not.toBeNull();
    const out = stripPng(input);
    expect(out).toEqual(makePng(2, 2));
    expect((await readPhotoDetails(out)).groups).toEqual({});
  });
});

describe('stripWebp', () => {
  const chunk = (fourcc: string, data: Uint8Array) => {
    const pad = data.length & 1 ? [0] : [];
    const len = data.length;
    return [...text(fourcc), len & 255, (len >>> 8) & 255, 0, 0, ...data, ...pad];
  };
  const riff = (body: number[]) => {
    const size = body.length + 4;
    return Uint8Array.from([
      ...text('RIFF'),
      size & 255,
      (size >>> 8) & 255,
      0,
      0,
      ...text('WEBP'),
      ...body,
    ]);
  };

  it('drops EXIF and XMP chunks, clears their flags and fixes the size', () => {
    const vp8x = Uint8Array.from([VP8X_FLAGS, 0, 0, 0, 1, 0, 0, 1, 0, 0]);
    const picture = Uint8Array.from([0x2f, 1, 2, 3, 4]);
    const input = riff([
      ...chunk('VP8X', vp8x),
      ...chunk('VP8L', picture),
      ...chunk('EXIF', exifBlock(FULL).subarray(6)),
      ...chunk('XMP ', text('<x:xmpmeta/>')),
    ]);
    const out = stripWebp(input);
    const expected = riff([
      ...chunk('VP8X', Uint8Array.from([0x10, 0, 0, 0, 1, 0, 0, 1, 0, 0])),
      ...chunk('VP8L', picture),
    ]);
    expect(out).toEqual(expected);
  });
});

/** Alpha + EXIF + XMP flags. */
const VP8X_FLAGS = 0x10 | 0x08 | 0x04;

describe('stripKind and stripImage', () => {
  it('goes by the signature, not the name', () => {
    expect(stripKind(makeJpeg())).toBe('jpeg');
    expect(stripKind(makePng(1, 1))).toBe('png');
    expect(stripKind(text('GIF89a'))).toBeNull();
    expect(() => stripImage(text('GIF89a'))).toThrow(StripError);
  });
});
