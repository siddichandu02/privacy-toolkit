import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { PDFDocument, PDFName, PDFNumber, PDFRawStream } from 'pdf-lib';
import { makePdf } from './make-pdf';

/** A big, noisy photo drawn on a canvas in the page, saved as a high-quality JPEG. */
async function photo(page: Page, width: number, height: number) {
  const base64 = await page.evaluate(
    ([w, h]) => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no canvas');
      const img = ctx.createImageData(w, h);
      let seed = 11;
      for (let i = 0; i < img.data.length; i += 4) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const n = (seed >>> 16) & 63;
        img.data[i] = 120 + n;
        img.data[i + 1] = 80 + ((i / 4) % w) / 20 + n;
        img.data[i + 2] = 160 - n;
        img.data[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.95).split(',')[1] ?? '';
    },
    [width, height] as const,
  );
  return Buffer.from(base64, 'base64');
}

async function photoPdf(page: Page) {
  const doc = await PDFDocument.create();
  const sheet = doc.addPage([612, 792]);
  const jpg = await doc.embedJpg(await photo(page, 2600, 1800));
  sheet.drawImage(jpg, { x: 36, y: 300, width: 540, height: 374 });
  return Buffer.from(await doc.save());
}

/** Widths of the images inside a saved PDF. */
async function imageWidths(path: string) {
  const doc = await PDFDocument.load(await readFile(path));
  return doc.context
    .enumerateIndirectObjects()
    .map(([, o]) => o)
    .filter((o): o is PDFRawStream => o instanceof PDFRawStream)
    .filter((o) => o.dict.lookup(PDFName.of('Subtype'))?.toString() === '/Image')
    .map((o) => (o.dict.lookup(PDFName.of('Width')) as PDFNumber).asNumber());
}

test('shrinks the photos in a pdf and shows the saving', async ({ page, baseURL }) => {
  const origin = new URL(baseURL ?? '').origin;
  const outside: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    if (/^(blob|data):/.test(url)) return;
    if (new URL(url).origin !== origin) outside.push(url);
  });

  await page.goto('./#/tools/compress-pdf');
  await expect(page.getByText('Being built right now')).toHaveCount(0);
  const buffer = await photoPdf(page);
  await page
    .getByTestId('file-input')
    .setInputFiles([{ name: 'brochure.pdf', mimeType: 'application/pdf', buffer }]);
  await expect(page.getByRole('radio', { name: 'Balanced' })).toBeChecked();
  await page.getByRole('button', { name: 'Compress PDF' }).click();

  await expect(page.getByRole('heading', { name: 'Your PDF is smaller' })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText('1 photo re-saved.', { exact: false })).toBeVisible();
  await expect(page.getByTestId('size-compare')).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Download PDF' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('brochure-compressed.pdf');
  const path = await download.path();
  const size = (await readFile(path)).length;
  expect(size).toBeLessThan(buffer.length / 2);
  expect(await imageWidths(path)).toEqual([2000]);
  expect(outside).toEqual([]);
});

test('hands back the original when there is nothing to squeeze', async ({ page }) => {
  await page.goto('./#/tools/compress-pdf');
  const doc = await PDFDocument.load(makePdf(1, 'Lean'), { updateMetadata: false });
  const buffer = Buffer.from(await doc.save({ useObjectStreams: true }));
  await page
    .getByTestId('file-input')
    .setInputFiles([{ name: 'lean.pdf', mimeType: 'application/pdf', buffer }]);
  await page.locator('label', { hasText: 'Light' }).click();
  await page.getByRole('button', { name: 'Compress PDF' }).click();
  await expect(page.getByRole('heading', { name: 'This PDF is already lean' })).toBeVisible({
    timeout: 15_000,
  });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Download original' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('lean.pdf');
  expect((await readFile(await download.path())).length).toBe(buffer.length);
});
