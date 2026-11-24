import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';
import { readPhotoDetails } from '../src/lib/image/exif-read';
import { makeExifJpeg, makeExifPng, makeJpeg } from '../src/test/make-image';

const HOLIDAY = {
  make: 'Apple',
  model: 'iPhone 15 Pro',
  artist: 'Sam Rivera',
  taken: '2024:07:14 18:22:05',
  gps: { lat: 48.85837, lon: 2.294481 },
};

/** A real JPEG ends with EOI; the tiny fixture stops after its picture data. */
const plain = Uint8Array.from([...makeJpeg(), 0xff, 0xd9]);
const jpeg = Buffer.from(makeExifJpeg(HOLIDAY, plain));

test('shows where a photo was taken, then removes it without touching the picture', async ({
  page,
  baseURL,
}) => {
  const origin = new URL(baseURL ?? '').origin;
  const outside: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    if (/^(blob|data):/.test(url)) return;
    if (new URL(url).origin !== origin) outside.push(url);
  });

  await page.goto('./#/tools/exif');
  await expect(page.getByText('Being built right now')).toHaveCount(0);
  await page
    .getByTestId('file-input')
    .setInputFiles([{ name: 'beach.jpg', mimeType: 'image/jpeg', buffer: jpeg }]);

  await expect(page.getByTestId('exif-headline')).toHaveText(
    'Anyone who gets this photo can see where it was taken, when and whose it is.',
  );
  const findings = page.getByTestId('findings');
  await expect(findings).toContainText('48.85837° N, 2.29448° E');
  await expect(findings).toContainText('14 Jul 2024, 18:22');
  await expect(findings).toContainText('Apple iPhone 15 Pro');
  await expect(findings).toContainText('Sam Rivera');
  await expect(page.getByTestId('globe')).toBeVisible();

  await page.getByRole('button', { name: 'Remove details' }).click();
  await expect(page.getByRole('heading', { name: 'Your photo is clean' })).toBeVisible();
  await expect(page.getByTestId('clean-check')).toHaveText(
    'Checked again on this device: no personal details left.',
  );

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Download photo' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('beach.jpg');
  const out = new Uint8Array(await readFile(await download.path()));
  // Same bytes as the photo before it had any details: not one pixel redrawn.
  expect(Buffer.from(out).equals(Buffer.from(plain))).toBe(true);
  const left = await readPhotoDetails(out);
  expect(left.location).toBeNull();
  expect(left.groups).toEqual({});

  expect(outside).toEqual([]);
});

test('a batch names the photos that give a place away and comes back as a zip', async ({
  page,
}) => {
  await page.goto('./#/tools/exif');
  await page.getByTestId('file-input').setInputFiles([
    { name: 'beach.jpg', mimeType: 'image/jpeg', buffer: jpeg },
    {
      name: 'logo.png',
      mimeType: 'image/png',
      buffer: Buffer.from(makeExifPng({ software: 'Sketchbook' }, 30, 20)),
    },
    { name: 'broken.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('not a photo') },
  ]);

  await expect(page.getByTestId('exif-headline')).toHaveText(
    '1 of 3 photos show where they were taken.',
  );
  await expect(page.getByTestId('exif-thumb')).toHaveCount(3);
  await expect(page.getByTestId('exif-thumb-pin')).toHaveCount(1);

  // Look inside the PNG: only an editing app.
  await page.getByRole('button', { name: /^logo\.png/ }).click();
  await expect(page.getByTestId('findings')).toContainText('Sketchbook');
  await expect(page.getByTestId('globe')).toHaveCount(0);

  await page.getByRole('button', { name: 'Clean 3 photos' }).click();
  await expect(page.getByRole('heading', { name: 'Your photos are clean' })).toBeVisible();
  await expect(page.getByText(/Left out broken\.jpg/)).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Download ZIP' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('photos-without-details.zip');
  const zip = await JSZip.loadAsync(await readFile(await download.path()));
  expect(Object.keys(zip.files).sort()).toEqual(['beach.jpg', 'logo.png']);
  for (const name of ['beach.jpg', 'logo.png']) {
    const bytes = await zip.file(name)?.async('uint8array');
    expect((await readPhotoDetails(bytes as Uint8Array)).groups).toEqual({});
  }
});
