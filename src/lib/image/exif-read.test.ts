import { describe, expect, it } from 'vitest';
import { makeExifJpeg, makeExifPng, makeJpeg, makePng } from '../../test/make-image';
import { formatCoords, formatTaken, revealLine, summarizeDetails } from './exif-details';
import { readPhotoDetails } from './exif-read';

const HOLIDAY = {
  make: 'Apple',
  model: 'iPhone 15 Pro',
  software: '17.4.1',
  artist: 'Sam Rivera',
  taken: '2024:07:14 18:22:05',
  iso: 64,
  serial: 'F2LX81234',
  orientation: 6,
  gps: { lat: 48.85837, lon: 2.294481 },
};

describe('readPhotoDetails', () => {
  it('finds location, date, owner, camera and app in a JPEG', async () => {
    const d = await readPhotoDetails(makeExifJpeg(HOLIDAY));
    expect(d.location?.lat).toBeCloseTo(48.85837, 4);
    expect(d.location?.lon).toBeCloseTo(2.294481, 4);
    expect(d.groups.when).toEqual([{ label: 'Taken', value: '14 Jul 2024, 18:22' }]);
    expect(d.groups.owner).toContainEqual({ label: 'Name', value: 'Sam Rivera' });
    expect(d.groups.owner).toContainEqual({ label: 'Camera serial number', value: 'F2LX81234' });
    expect(d.groups.camera).toEqual([{ label: 'Device', value: 'Apple iPhone 15 Pro' }]);
    expect(d.groups.settings).toEqual([{ label: 'ISO', value: '64' }]);
    expect(d.groups.software).toEqual([{ label: 'App', value: '17.4.1' }]);
    expect(d.orientation).toBe(6);
    expect(d.total).toBeGreaterThan(8);
  });

  it('reads the eXIf chunk of a PNG', async () => {
    const d = await readPhotoDetails(
      makeExifPng({ model: 'Pixel 8', gps: { lat: -33.8568, lon: 151.2153 } }),
    );
    expect(d.location?.lat).toBeCloseTo(-33.8568, 3);
    expect(d.location?.lon).toBeCloseTo(151.2153, 3);
    expect(d.groups.camera).toEqual([{ label: 'Device', value: 'Pixel 8' }]);
  });

  it('gives empty details for a clean photo or junk', async () => {
    for (const bytes of [makeJpeg(), makePng(2, 2), new Uint8Array([1, 2, 3])]) {
      const d = await readPhotoDetails(bytes);
      expect(d.location).toBeNull();
      expect(d.groups).toEqual({});
    }
  });

  it('gives empty details when the reader fails', async () => {
    const d = await readPhotoDetails(new Uint8Array(4), () => Promise.reject(new Error('x')));
    expect(d.total).toBe(0);
  });
});

describe('summarizeDetails', () => {
  it('ignores the 0,0 no-fix position and out of range values', () => {
    expect(summarizeDetails({ latitude: 0, longitude: 0 }).location).toBeNull();
    expect(summarizeDetails({ latitude: 95, longitude: 10 }).location).toBeNull();
  });

  it('does not repeat the maker when the model already names it', () => {
    const d = summarizeDetails({ Make: 'Canon', Model: 'Canon EOS R6' });
    expect(d.groups.camera).toEqual([{ label: 'Device', value: 'Canon EOS R6' }]);
  });

  it('formats camera settings', () => {
    const d = summarizeDetails({ FNumber: 1.78, ExposureTime: 0.004, FocalLength: 6.86 });
    expect(d.groups.settings).toEqual([
      { label: 'Aperture', value: 'f/1.8' },
      { label: 'Shutter', value: '1/250 s' },
      { label: 'Focal length', value: '7 mm' },
    ]);
  });
});

describe('format helpers', () => {
  it('formats dates as written', () => {
    expect(formatTaken('2023:01:05 07:03:00')).toBe('5 Jan 2023, 07:03');
    expect(formatTaken('nonsense')).toBeNull();
  });

  it('formats coordinates with hemispheres', () => {
    expect(formatCoords({ lat: -1.5, lon: -70.25 })).toBe('1.50000° S, 70.25000° W');
  });

  it('sums up what a photo reveals', () => {
    expect(revealLine(summarizeDetails({ latitude: 1, longitude: 2, Make: 'X' }))).toBe(
      'Location and camera',
    );
    expect(revealLine(summarizeDetails({ ColorSpace: 1 }))).toBe('Only technical details');
    expect(revealLine(summarizeDetails({}))).toBe('Nothing hidden');
  });
});
