import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import { makePng, withOrientation } from '../src/test/make-image';

const png = (name: string, w: number, h: number) => ({
  name,
  mimeType: 'image/png',
  buffer: Buffer.from(makePng(w, h)),
});

async function pageSizes(path: string) {
  const doc = await PDFDocument.load(await readFile(path));
  return doc.getPages().map((p) => [Math.round(p.getWidth()), Math.round(p.getHeight())]);
}

test('turns images into one pdf on the device', async ({ page, baseURL }) => {
  const origin = new URL(baseURL ?? '').origin;
  const outside: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    if (/^(blob|data):/.test(url)) return;
    if (new URL(url).origin !== origin) outside.push(url);
  });

  await page.goto('./#/tools/images-to-pdf');
  await expect(page.getByText('Being built right now')).toHaveCount(0);
  await page
    .getByTestId('file-input')
    .setInputFiles([png('wide.png', 160, 90), png('tall.png', 90, 160)]);

  const preview = page.getByTestId('page-preview');
  await expect(preview).toHaveAttribute('data-orientation', 'landscape');
  await page.getByRole('button', { name: 'Show the next page' }).click();
  await expect(preview).toHaveAttribute('data-orientation', 'portrait');

  await page.getByText('Letter', { exact: true }).click();
  await page.getByRole('button', { name: 'Make a 2-page PDF' }).click();
  await expect(page.getByRole('heading', { name: 'Your PDF is ready' })).toBeVisible({
    timeout: 15_000,
  });

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Download PDF' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('wide-and-1-more.pdf');
  expect(await pageSizes(await download.path())).toEqual([
    [792, 612],
    [612, 792],
  ]);
  expect(outside).toEqual([]);
});

test('fit image sizes pages to each photo and turns phone photos upright', async ({ page }) => {
  await page.goto('./#/tools/images-to-pdf');
  // A real 40x20 JPEG from the browser, tagged as turned 90 degrees like a phone photo.
  const jpeg = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 40;
    c.height = 20;
    const ctx = c.getContext('2d') as CanvasRenderingContext2D;
    ctx.fillStyle = '#3ddc97';
    ctx.fillRect(0, 0, 40, 20);
    return c.toDataURL('image/jpeg').split(',')[1] as string;
  });
  const phone = withOrientation(new Uint8Array(Buffer.from(jpeg, 'base64')), 6);
  await page
    .getByTestId('file-input')
    .setInputFiles([
      png('shot.png', 200, 100),
      { name: 'phone.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(phone) },
    ]);
  await page.getByText('Fit image', { exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Portrait' })).toBeDisabled();
  await page.getByText('None', { exact: true }).click();
  await page.getByRole('button', { name: 'Make a 2-page PDF' }).click();
  await expect(page.getByRole('heading', { name: 'Your PDF is ready' })).toBeVisible({
    timeout: 15_000,
  });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Download PDF' }).click(),
  ]);
  expect(await pageSizes(await download.path())).toEqual([
    [150, 75],
    [15, 30],
  ]);
});

test('says which image could not be read', async ({ page }) => {
  await page.goto('./#/tools/images-to-pdf');
  await page
    .getByTestId('file-input')
    .setInputFiles([
      png('fine.png', 20, 20),
      { name: 'broken.webp', mimeType: 'image/webp', buffer: Buffer.from('not an image at all') },
    ]);
  await page.getByRole('button', { name: 'Make a 2-page PDF' }).click();
  await expect(page.getByRole('heading', { name: 'The PDF was not made' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(/broken\.webp could not be read/)).toBeVisible();
});
