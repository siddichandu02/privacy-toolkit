// What a photo gives away, in plain groups people understand. Kept apart from
// the reader (which loads exifr) so the page can use these helpers cheaply.

export interface PhotoLocation {
  lat: number;
  lon: number;
  /** Metres above sea level, when the camera wrote it. */
  altitude?: number;
}

export type DetailGroup = 'location' | 'when' | 'camera' | 'settings' | 'software' | 'owner';

export interface DetailRow {
  label: string;
  value: string;
}

export interface PhotoDetails {
  location: PhotoLocation | null;
  /** Rows per group, only groups that have something. */
  groups: Partial<Record<DetailGroup, DetailRow[]>>;
  /** Every tag found, including dull ones like the colour space. */
  total: number;
  /** Tags not shown in any row: the dull technical ones. */
  extra: number;
  /** EXIF turn, 1 to 8. Kept in the cleaned copy so the photo stays upright. */
  orientation: number;
}

export const NO_DETAILS: PhotoDetails = {
  location: null,
  groups: {},
  total: 0,
  extra: 0,
  orientation: 1,
};

/** Groups in the order they matter to a person, most revealing first. */
export const GROUP_ORDER: readonly DetailGroup[] = [
  'location',
  'when',
  'owner',
  'camera',
  'settings',
  'software',
];

export const GROUP_TITLE: Record<DetailGroup, string> = {
  location: 'Where it was taken',
  when: 'When it was taken',
  owner: 'Who it belongs to',
  camera: 'The camera or phone',
  settings: 'Camera settings',
  software: 'Editing apps',
};

type Raw = Record<string, unknown>;

/** Tags that feed a row, or say how to read one (refs, the turn). The rest are technical. */
const SHOWN = new Set([
  'latitude',
  'longitude',
  'GPSLatitude',
  'GPSLongitude',
  'GPSLatitudeRef',
  'GPSLongitudeRef',
  'GPSAltitude',
  'GPSAltitudeRef',
  'DateTimeOriginal',
  'CreateDate',
  'DateCreated',
  'ModifyDate',
  'Artist',
  'OwnerName',
  'CameraOwnerName',
  'Copyright',
  'Rights',
  'BodySerialNumber',
  'SerialNumber',
  'LensSerialNumber',
  'Make',
  'Model',
  'LensModel',
  'Lens',
  'FNumber',
  'ExposureTime',
  'ISO',
  'ISOSpeedRatings',
  'FocalLength',
  'Software',
  'CreatorTool',
  'HostComputer',
  'Orientation',
]);

const text = (v: unknown): string | null => {
  if (typeof v === 'string') {
    const t = v.replace(/\0+$/, '').trim();
    return t ? t : null;
  }
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return null;
};

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * "14 Jul 2024, 18:22". Camera clocks carry no time zone, so the date is
 * shown exactly as written rather than shifted to this device's zone.
 */
export function formatTaken(v: unknown): string | null {
  let parts: number[] | null = null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    parts = [v.getFullYear(), v.getMonth() + 1, v.getDate(), v.getHours(), v.getMinutes()];
  } else if (typeof v === 'string') {
    const m = /^(\d{4})[:-](\d{2})[:-](\d{2})[ T](\d{2}):(\d{2})/.exec(v.trim());
    if (m) parts = m.slice(1).map(Number);
  }
  if (!parts) return null;
  const [y, mo, d, h, mi] = parts as [number, number, number, number, number];
  if (!y || mo < 1 || mo > 12) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d} ${MONTHS[mo - 1]} ${y}, ${pad(h)}:${pad(mi)}`;
}

/** "48.85837° N, 2.29448° E": five decimals is about a metre. */
export function formatCoords({ lat, lon }: PhotoLocation): string {
  const f = (n: number, pos: string, neg: string) =>
    `${Math.abs(n).toFixed(5)}° ${n >= 0 ? pos : neg}`;
  return `${f(lat, 'N', 'S')}, ${f(lon, 'E', 'W')}`;
}

/** "1/250 s" for short shutter times, "2 s" for long ones. */
function shutter(v: number): string {
  if (v >= 1) return `${Math.round(v * 10) / 10} s`;
  return `1/${Math.round(1 / v)} s`;
}

function location(raw: Raw): PhotoLocation | null {
  const lat = num(raw.latitude);
  const lon = num(raw.longitude);
  if (lat === null || lon === null) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  // 0,0 is in the sea off Africa; cameras write it when they had no fix.
  if (lat === 0 && lon === 0) return null;
  const altitude = num(raw.GPSAltitude);
  return altitude === null ? { lat, lon } : { lat, lon, altitude: Math.round(altitude) };
}

/**
 * Turn exifr's flat output into groups of plain rows. Only details a person
 * would care about get a row; everything else still counts in `total`.
 */
export function summarizeDetails(raw: Raw | null | undefined): PhotoDetails {
  if (!raw) return NO_DETAILS;
  const groups: PhotoDetails['groups'] = {};
  const add = (group: DetailGroup, label: string, value: string | null) => {
    if (!value) return;
    (groups[group] ??= []).push({ label, value });
  };

  const loc = location(raw);
  if (loc) {
    add('location', 'Coordinates', formatCoords(loc));
    if (loc.altitude !== undefined) add('location', 'Altitude', `${loc.altitude} m`);
  }

  add(
    'when',
    'Taken',
    formatTaken(raw.DateTimeOriginal) ??
      formatTaken(raw.CreateDate) ??
      formatTaken(raw.DateCreated),
  );
  const modified = formatTaken(raw.ModifyDate);
  if (modified && modified !== groups.when?.[0]?.value) add('when', 'Last edited', modified);

  add('owner', 'Name', text(raw.Artist) ?? text(raw.OwnerName) ?? text(raw.CameraOwnerName));
  add('owner', 'Copyright', text(raw.Copyright) ?? text(raw.Rights));
  add('owner', 'Camera serial number', text(raw.BodySerialNumber) ?? text(raw.SerialNumber));
  add('owner', 'Lens serial number', text(raw.LensSerialNumber));

  const make = text(raw.Make);
  const model = text(raw.Model);
  // Many phones repeat the maker in the model: "Apple" + "iPhone 15" vs "Canon" + "Canon EOS R6".
  const device =
    make && model
      ? model.toLowerCase().startsWith(make.toLowerCase())
        ? model
        : `${make} ${model}`
      : (model ?? make);
  add('camera', 'Device', device);
  add('camera', 'Lens', text(raw.LensModel) ?? text(raw.Lens));

  const f = num(raw.FNumber);
  add('settings', 'Aperture', f ? `f/${Math.round(f * 10) / 10}` : null);
  const t = num(raw.ExposureTime);
  add('settings', 'Shutter', t ? shutter(t) : null);
  const iso = num(raw.ISO) ?? num(raw.ISOSpeedRatings);
  add('settings', 'ISO', iso ? String(iso) : null);
  const focal = num(raw.FocalLength);
  add('settings', 'Focal length', focal ? `${Math.round(focal)} mm` : null);

  add('software', 'App', text(raw.Software) ?? text(raw.CreatorTool));
  add('software', 'Computer', text(raw.HostComputer));

  const orientation = num(raw.Orientation);
  const present = Object.entries(raw).filter(([, v]) => v !== undefined && v !== null);
  return {
    location: loc,
    groups,
    total: present.length,
    extra: present.filter(([k]) => !SHOWN.has(k)).length,
    orientation: orientation && orientation >= 1 && orientation <= 8 ? orientation : 1,
  };
}

/** How many groups have something to remove. */
export const revealCount = (d: PhotoDetails) => Object.keys(d.groups).length;

/** One short line for a photo in the list: "Location, date and camera". */
export function revealLine(d: PhotoDetails): string {
  const words: Record<DetailGroup, string> = {
    location: 'location',
    when: 'date',
    owner: 'owner',
    camera: 'camera',
    settings: 'settings',
    software: 'apps',
  };
  const found = GROUP_ORDER.filter((g) => d.groups[g]).map((g) => words[g]);
  if (!found.length) return d.total ? 'Only technical details' : 'Nothing hidden';
  const first = found[0] as string;
  found[0] = first.charAt(0).toUpperCase() + first.slice(1);
  if (found.length === 1) return found[0] as string;
  return `${found.slice(0, -1).join(', ')} and ${found[found.length - 1]}`;
}
