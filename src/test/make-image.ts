/**
 * Tiny real image files for tests, built in code so there are no binary
 * fixtures. No Node or DOM APIs, so unit and e2e tests can both use it.
 */

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = (CRC_TABLE[(c ^ b) & 0xff] as number) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function adler32(bytes: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (const x of bytes) {
    a = (a + x) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];

function concat(parts: (Uint8Array | number[])[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const head = Uint8Array.from(type, (ch) => ch.charCodeAt(0));
  const body = concat([head, data]);
  return concat([u32(data.length), body, u32(crc32(body))]);
}

/** zlib stream with uncompressed blocks: valid and simple. */
function zlibStore(raw: Uint8Array): Uint8Array {
  const parts: (Uint8Array | number[])[] = [[0x78, 0x01]];
  const blocks = Math.max(1, Math.ceil(raw.length / 65535));
  for (let i = 0; i < blocks; i++) {
    const block = raw.subarray(i * 65535, (i + 1) * 65535);
    const last = i === blocks - 1 ? 1 : 0;
    const len = block.length;
    parts.push([last, len & 255, len >>> 8, ~len & 255, (~len >>> 8) & 255], block);
  }
  parts.push(u32(adler32(raw)));
  return concat(parts);
}

/** A solid-colour RGB PNG of `width` x `height` pixels. */
export function makePng(
  width: number,
  height: number,
  rgb: [number, number, number] = [61, 220, 151],
) {
  const row = 1 + width * 3;
  const raw = new Uint8Array(row * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) raw.set(rgb, y * row + 1 + x * 3);
  }
  const ihdr = concat([u32(width), u32(height), [8, 2, 0, 0, 0]]);
  return concat([
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    chunk('IHDR', ihdr),
    chunk('IDAT', zlibStore(raw)),
    chunk('IEND', new Uint8Array()),
  ]);
}

/** A 1x1 baseline JPEG: just enough headers for a PDF to embed. */
const JPEG_1X1 =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

function fromBase64(text: string): Uint8Array {
  const bin = atob(text);
  return Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
}

/**
 * A 1x1 JPEG, optionally carrying an EXIF orientation tag (1 to 8) in a
 * big- or little-endian TIFF block.
 */
export function makeJpeg(orientation?: number, littleEndian = false): Uint8Array {
  const base = fromBase64(JPEG_1X1);
  if (orientation === undefined) return base;
  const le = littleEndian;
  const u16 = (n: number) => (le ? [n & 255, n >>> 8] : [n >>> 8, n & 255]);
  const u32x = (n: number) => (le ? u32(n).reverse() : u32(n));
  const tiff = [
    ...(le ? [0x49, 0x49] : [0x4d, 0x4d]),
    ...u16(42),
    ...u32x(8),
    ...u16(1),
    // Orientation tag, type SHORT, count 1, value padded to 4 bytes.
    ...u16(0x0112),
    ...u16(3),
    ...u32x(1),
    ...u16(orientation),
    0,
    0,
    ...u32x(0),
  ];
  const exif = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
  const len = exif.length + 2;
  return concat([[0xff, 0xd8, 0xff, 0xe1, len >>> 8, len & 255], exif, base.subarray(2)]);
}
