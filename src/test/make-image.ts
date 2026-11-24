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
  return orientation === undefined ? base : withOrientation(base, orientation, littleEndian);
}

/** Put an EXIF orientation tag (1 to 8) at the front of any JPEG. */
export function withOrientation(
  jpeg: Uint8Array,
  orientation: number,
  littleEndian = false,
): Uint8Array {
  const base = jpeg;
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

type TiffValue = string | number[] | [number, number][];
interface TiffEntry {
  tag: number;
  /** 2 ASCII, 3 SHORT, 4 LONG, 5 RATIONAL. */
  type: 2 | 3 | 4 | 5;
  value: TiffValue;
}

export interface FakeExif {
  make?: string;
  model?: string;
  software?: string;
  artist?: string;
  /** "2024:07:14 18:22:05" */
  taken?: string;
  iso?: number;
  serial?: string;
  orientation?: number;
  gps?: { lat: number; lon: number };
}

const BYTES_PER: Record<TiffEntry['type'], number> = { 2: 1, 3: 2, 4: 4, 5: 8 };

/** A big-endian TIFF block with IFD0, an Exif IFD and a GPS IFD, as found in camera photos. */
function tiffBlock(ifd0: TiffEntry[], exif: TiffEntry[], gps: TiffEntry[]): Uint8Array {
  const ifds = [ifd0, exif, gps].filter((e, i) => i === 0 || e.length > 0);
  // Pointers to the sub IFDs live in IFD0; their values are patched in below.
  if (exif.length) ifd0.push({ tag: 0x8769, type: 4, value: [0] });
  if (gps.length) ifd0.push({ tag: 0x8825, type: 4, value: [0] });
  for (const ifd of ifds) ifd.sort((a, b) => a.tag - b.tag);
  const ifdSize = (n: number) => 2 + 12 * n + 4;
  const starts: number[] = [];
  let at = 8;
  for (const ifd of ifds) {
    starts.push(at);
    at += ifdSize(ifd.length);
  }
  const ptr = (tag: number, to: number) => {
    const e = ifd0.find((x) => x.tag === tag);
    if (e) e.value = [to];
  };
  if (exif.length) ptr(0x8769, starts[1] as number);
  if (gps.length) ptr(0x8825, starts[ifds.length - 1] as number);

  const out: number[] = [0x4d, 0x4d, 0, 42, ...u32(8)];
  const data: number[] = [];
  const dataStart = at;
  const u16 = (n: number) => [n >>> 8, n & 255];
  const encode = (e: TiffEntry): { count: number; bytes: number[] } => {
    if (e.type === 2) {
      const s = `${e.value as string}\0`;
      return { count: s.length, bytes: Array.from(s, (c) => c.charCodeAt(0)) };
    }
    if (e.type === 5) {
      const pairs = e.value as [number, number][];
      return { count: pairs.length, bytes: pairs.flatMap(([n, d]) => [...u32(n), ...u32(d)]) };
    }
    const nums = e.value as number[];
    return { count: nums.length, bytes: nums.flatMap((n) => (e.type === 3 ? u16(n) : u32(n))) };
  };
  for (const ifd of ifds) {
    out.push(...u16(ifd.length));
    for (const e of ifd) {
      const { count, bytes } = encode(e);
      out.push(...u16(e.tag), ...u16(e.type), ...u32(count));
      if (count * BYTES_PER[e.type] <= 4) {
        out.push(...bytes, ...Array(4 - bytes.length).fill(0));
      } else {
        out.push(...u32(dataStart + data.length));
        data.push(...bytes);
        if (data.length % 2) data.push(0);
      }
    }
    out.push(...u32(0));
  }
  return Uint8Array.from([...out, ...data]);
}

const dms = (deg: number): [number, number][] => {
  const a = Math.abs(deg);
  const d = Math.floor(a);
  const m = Math.floor((a - d) * 60);
  const s = Math.round(((a - d) * 60 - m) * 60 * 10000);
  return [
    [d, 1],
    [m, 1],
    [s, 10000],
  ];
};

/** EXIF block (with the "Exif\0\0" prefix) for the given details. */
export function exifBlock(details: FakeExif): Uint8Array {
  const ifd0: TiffEntry[] = [];
  const exif: TiffEntry[] = [];
  const gps: TiffEntry[] = [];
  if (details.make) ifd0.push({ tag: 0x010f, type: 2, value: details.make });
  if (details.model) ifd0.push({ tag: 0x0110, type: 2, value: details.model });
  if (details.orientation) ifd0.push({ tag: 0x0112, type: 3, value: [details.orientation] });
  if (details.software) ifd0.push({ tag: 0x0131, type: 2, value: details.software });
  if (details.artist) ifd0.push({ tag: 0x013b, type: 2, value: details.artist });
  if (details.taken) exif.push({ tag: 0x9003, type: 2, value: details.taken });
  if (details.iso) exif.push({ tag: 0x8827, type: 3, value: [details.iso] });
  if (details.serial) exif.push({ tag: 0xa431, type: 2, value: details.serial });
  if (details.gps) {
    const { lat, lon } = details.gps;
    gps.push(
      { tag: 0x0001, type: 2, value: lat >= 0 ? 'N' : 'S' },
      { tag: 0x0002, type: 5, value: dms(lat) },
      { tag: 0x0003, type: 2, value: lon >= 0 ? 'E' : 'W' },
      { tag: 0x0004, type: 5, value: dms(lon) },
    );
  }
  const tiff = tiffBlock(ifd0, exif, gps);
  return concat([[0x45, 0x78, 0x69, 0x66, 0, 0], tiff]);
}

/** A JPEG carrying camera, date and location details in an APP1 EXIF segment. */
export function makeExifJpeg(details: FakeExif, jpeg: Uint8Array = makeJpeg()): Uint8Array {
  const exif = exifBlock(details);
  const len = exif.length + 2;
  return concat([[0xff, 0xd8, 0xff, 0xe1, len >>> 8, len & 255], exif, jpeg.subarray(2)]);
}

/** A PNG carrying the same details in an eXIf chunk, plus a text comment. */
export function makeExifPng(details: FakeExif, width = 2, height = 2): Uint8Array {
  const png = makePng(width, height);
  // Insert after IHDR (8 signature + 25 IHDR bytes).
  const at = 8 + 25;
  const tiff = exifBlock(details).subarray(6);
  const text = Uint8Array.from('Comment\0taken on holiday', (c) => c.charCodeAt(0));
  return concat([png.subarray(0, at), chunk('eXIf', tiff), chunk('tEXt', text), png.subarray(at)]);
}
