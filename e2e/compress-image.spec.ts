import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';

/** A noisy photo drawn in the page and saved as a high-quality image. */
async function photo(page: Page, width: number, height: number, type = 'image/jpeg') {
  const base64 = await page.evaluate(
    ([w, h, t]) => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no canvas');
      const img = ctx.createImageData(w, h);
      let seed = 7;
      for (let i = 0; i < img.data.length; i += 4) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const n = (seed >>> 16) & 31;
        const x = (i / 4) % w;
        img.data[i] = 90 + (x / w) * 120 + n;
        img.data[i + 1] = 140 - n;
        img.data[i + 2] = 200 - (x / w) * 80 + n;
        img.data[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      return canvas.toDataURL(t, 0.97).split(',')[1] ?? '';
    },
    [width, height, type] as const,
  );
  return Buffer.from(base64, 'base64');
}

test('compresses a photo on the device with a live before and after', async ({ page, baseURL }) => {
  const origin = new URL(baseURL ?? '').origin;
  const outside: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    if (/^(blob|data):/.test(url)) return;
    if (new URL(url).origin !== origin) outside.push(url);
  });

  await page.goto('./#/tools/compress-image');
  await expect(page.getByText('Being built right now')).toHaveCount(0);
  const buffer = await photo(page, 1600, 1200);
  await page
    .getByTestId('file-input')
    .setInputFiles([{ name: 'beach.jpg', mimeType: 'image/jpeg', buffer }]);

  // The preview is a real re-save, with its real size.
  const size = page.getByTestId('preview-size');
  await expect(size).toContainText('smaller', { timeout: 15_000 });
  await expect(page.getByTestId('photo-compare-after')).toHaveAttribute('src', /^blob:/);
  const firstGuess = (await size.textContent()) ?? '';
  await page.getByLabel('Quality').fill('30');
  await expect(size).not.toHaveText(firstGuess, { timeout: 10_000 });

  await page.getByText('1280', { exact: true }).click();
  await page.getByRole('button', { name: 'Compress photo' }).click();
  await expect(page.getByRole('heading', { name: 'Your photo is smaller' })).toBeVisible({
    timeout: 15_000,
  });

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Download photo' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('beach-compressed.jpg');
  const out = await readFile(await download.path());
  expect(out.length).toBeLessThan(buffer.length / 2);
  // Still a JPEG, now 1280 px wide.
  expect(out.subarray(0, 2).toString('hex')).toBe('ffd8');
  const width = await page.evaluate(async (b64) => {
    const blob = await (await fetch(`data:image/jpeg;base64,${b64}`)).blob();
    return (await createImageBitmap(blob)).width;
  }, out.toString('base64'));
  expect(width).toBe(1280);

  expect(outside).toEqual([]);
});

test('several photos come back in one zip, and PNGs can become WebP', async ({ page }) => {
  await page.goto('./#/tools/compress-image');
  const jpg = await photo(page, 900, 600);
  const png = await photo(page, 600, 600, 'image/png');
  await page.getByTestId('file-input').setInputFiles([
    { name: 'one.jpg', mimeType: 'image/jpeg', buffer: jpg },
    { name: 'two.png', mimeType: 'image/png', buffer: png },
  ]);
  await expect(page.getByText('Photo 1 of 2')).toBeVisible();
  await page.getByRole('button', { name: 'Show the next photo' }).click();
  await expect(page.getByLabel('Quality')).toBeDisabled();
  await page.getByText('WebP', { exact: true }).click();
  await expect(page.getByLabel('Quality')).toBeEnabled();

  await page.getByRole('button', { name: 'Compress 2 photos' }).click();
  await expect(page.getByRole('heading', { name: 'Your photos are smaller' })).toBeVisible({
    timeout: 15_000,
  });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Download ZIP' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('compressed-photos.zip');
  const zip = await JSZip.loadAsync(await readFile(await download.path()));
  expect(Object.keys(zip.files).sort()).toEqual(['one-compressed.webp', 'two-compressed.webp']);
});

test('a file that is not really a photo is named, not fatal', async ({ page }) => {
  await page.goto('./#/tools/compress-image');
  const jpg = await photo(page, 600, 400);
  await page.getByTestId('file-input').setInputFiles([
    { name: 'good.jpg', mimeType: 'image/jpeg', buffer: jpg },
    { name: 'broken.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('not a photo') },
  ]);
  await page.getByRole('button', { name: 'Compress 2 photos' }).click();
  await expect(page.getByText(/Left out broken\.jpg/)).toBeVisible({ timeout: 15_000 });
});
