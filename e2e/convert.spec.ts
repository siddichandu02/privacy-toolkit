import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';
import { makePng } from '../src/test/make-image';
import { HEIC } from './heic';

// The HEIC decoder is a big file and slow to start when many browsers share one
// machine, so these tests get extra time.
test.slow();

const png = Buffer.from(makePng(40, 30, [255, 107, 139]));

/** Width, height and the colour of the middle pixel of an image file, read in the page. */
async function look(page: import('@playwright/test').Page, bytes: Buffer, type: string) {
  return page.evaluate(
    async ([b64, t]) => {
      const blob = await (await fetch(`data:${t};base64,${b64}`)).blob();
      const bitmap = await createImageBitmap(blob);
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no canvas');
      ctx.drawImage(bitmap, 0, 0);
      const px = ctx.getImageData(2, 2, 1, 1).data;
      return { width: bitmap.width, height: bitmap.height, corner: [px[0], px[1], px[2]] };
    },
    [bytes.toString('base64'), type] as const,
  );
}

test('turns an iPhone HEIC photo into a JPG on the device', async ({ page, baseURL }) => {
  const origin = new URL(baseURL ?? '').origin;
  const outside: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    if (/^(blob|data):/.test(url)) return;
    if (new URL(url).origin !== origin) outside.push(url);
  });

  await page.goto('./#/tools/convert');
  await expect(page.getByText('Being built right now')).toHaveCount(0);
  await page
    .getByTestId('file-input')
    .setInputFiles([{ name: 'IMG_0042.HEIC', mimeType: 'image/heic', buffer: HEIC }]);
  await expect(page.getByTestId('relabel')).toContainText('1 HEIC');
  await page.getByRole('button', { name: 'Convert to JPG' }).click();
  await expect(page.getByRole('heading', { name: 'Your photo is now JPG' })).toBeVisible({
    timeout: 90_000,
  });

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Download photo' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('IMG_0042.jpg');
  const out = await readFile(await download.path());
  expect(out.subarray(0, 2).toString('hex')).toBe('ffd8');
  const seen = await look(page, out, 'image/jpeg');
  expect([seen.width, seen.height]).toEqual([64, 48]);
  // The sky blue corner survives the trip (allowing for JPEG and HEIC rounding).
  const [r, g, b] = seen.corner as number[];
  expect(Math.abs((r ?? 0) - 76)).toBeLessThan(30);
  expect(Math.abs((g ?? 0) - 201)).toBeLessThan(30);
  expect(Math.abs((b ?? 0) - 240)).toBeLessThan(30);

  expect(outside).toEqual([]);
});

test('a mixed pile becomes WebP in one zip, and a broken file is named', async ({ page }) => {
  await page.goto('./#/tools/convert');
  await page.getByTestId('file-input').setInputFiles([
    { name: 'phone.heic', mimeType: 'image/heic', buffer: HEIC },
    { name: 'logo.png', mimeType: 'image/png', buffer: png },
    { name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not a photo') },
  ]);
  await page.getByText('WebP', { exact: true }).click();
  await page.getByRole('button', { name: 'Convert 3 photos to WebP' }).click();
  await expect(page.getByRole('heading', { name: 'Your photos are now WebP' })).toBeVisible({
    timeout: 90_000,
  });
  await expect(page.getByText(/Left out broken\.png/)).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Download ZIP' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('converted-photos.zip');
  const zip = await JSZip.loadAsync(await readFile(await download.path()));
  expect(Object.keys(zip.files).sort()).toEqual(['logo.webp', 'phone.webp']);
  const logo = Buffer.from((await zip.file('logo.webp')?.async('uint8array')) ?? []);
  expect(logo.subarray(8, 12).toString()).toBe('WEBP');
});

test('png keeps every pixel and switches the quality off', async ({ page }) => {
  await page.goto('./#/tools/convert');
  await page
    .getByTestId('file-input')
    .setInputFiles([{ name: 'phone.heic', mimeType: 'image/heic', buffer: HEIC }]);
  await page.getByText('PNG', { exact: true }).click();
  await expect(page.getByRole('slider', { name: 'Quality' })).toBeDisabled();
  await page.getByRole('button', { name: 'Convert to PNG' }).click();
  await expect(page.getByRole('heading', { name: 'Your photo is now PNG' })).toBeVisible({
    timeout: 90_000,
  });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Download photo' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('phone.png');
});
