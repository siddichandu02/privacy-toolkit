import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { PDFDocument, PDFName, PDFDict } from 'pdf-lib';
import { makePdf } from './make-pdf';

const pdf = (name: string, pages: number) => ({
  name,
  mimeType: 'application/pdf',
  buffer: makePdf(pages, name),
});

/** Pages of a saved PDF that carry an image, i.e. the signature. */
async function signedPages(path: string) {
  const doc = await PDFDocument.load(await readFile(path));
  return doc.getPages().map((p) => {
    const xobjects = p.node.Resources()?.lookupMaybe(PDFName.of('XObject'), PDFDict);
    return (xobjects?.keys().length ?? 0) > 0;
  });
}

async function scribble(page: Page) {
  const pad = page.getByTestId('signature-canvas');
  await pad.scrollIntoViewIfNeeded();
  const box = await pad.boundingBox();
  if (!box) throw new Error('no signature pad');
  const y = box.y + box.height * 0.55;
  await page.mouse.move(box.x + 40, y);
  await page.mouse.down();
  for (let i = 1; i <= 20; i++) {
    await page.mouse.move(box.x + 40 + i * 9, y - Math.sin(i / 2) * 18, { steps: 2 });
  }
  await page.mouse.up();
}

test('draws a signature and places it on a page', async ({ page, baseURL }) => {
  const origin = new URL(baseURL ?? '').origin;
  const outside: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    if (/^(blob|data):/.test(url)) return;
    if (new URL(url).origin !== origin) outside.push(url);
  });

  await page.goto('./#/tools/sign');
  await expect(page.getByText('Being built right now')).toHaveCount(0);
  await page.getByTestId('file-input').setInputFiles([pdf('lease.pdf', 2)]);
  await expect(page.getByText('Page 1 of 2')).toBeVisible({ timeout: 15_000 });
  const sign = page.getByRole('button', { name: 'Sign PDF' });
  await expect(sign).toBeDisabled();

  await scribble(page);
  const placed = page.getByTestId('signature-box');
  await expect(placed).toBeVisible();
  await expect(sign).toBeEnabled();

  // Drag it towards the top left.
  await page.getByTestId('sign-sheet').scrollIntoViewIfNeeded();
  const before = Number(await placed.getAttribute('data-x'));
  const b = await placed.boundingBox();
  if (!b) throw new Error('no signature box');
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x - 60, b.y - 80, { steps: 6 });
  await page.mouse.up();
  await expect
    .poll(async () => Number(await placed.getAttribute('data-x')))
    .toBeLessThan(before - 0.1);

  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.getByText('Signs page 2. lease.pdf stays as it is.')).toBeVisible();
  await sign.click();

  await expect(page.getByRole('heading', { name: 'Your signed PDF is ready' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText('Signed on page 2 of 2', { exact: false })).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Download PDF' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('lease-signed.pdf');
  expect(await signedPages(await download.path())).toEqual([false, true]);

  // Back to the page with the signature still there.
  await page.getByRole('button', { name: 'Move the signature' }).click();
  await expect(page.getByTestId('signature-box')).toBeVisible();
  expect(outside).toEqual([]);
});

test('types a name and signs every page', async ({ page }) => {
  await page.goto('./#/tools/sign');
  await page.getByTestId('file-input').setInputFiles([pdf('form.pdf', 3)]);
  await expect(page.getByText('Page 1 of 3')).toBeVisible({ timeout: 15_000 });
  await page.getByText('Type', { exact: true }).click();
  await page.getByLabel('Your name').fill('Alex Morgan');
  await expect(page.getByTestId('signature-box')).toBeVisible();
  await page.getByText('Every page', { exact: true }).click();
  await page.getByRole('button', { name: 'Sign PDF' }).click();

  await expect(page.getByText('Signed on all 3 pages', { exact: false })).toBeVisible({
    timeout: 15_000,
  });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Download PDF' }).click(),
  ]);
  expect(await signedPages(await download.path())).toEqual([true, true, true]);
});
