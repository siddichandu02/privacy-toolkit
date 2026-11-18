import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import { makePdf } from './make-pdf';

const pdf = (name: string, pages = 1) => ({
  name,
  mimeType: 'application/pdf',
  buffer: makePdf(pages, name),
});

test('merges PDFs on the device and downloads one file', async ({ page, baseURL }) => {
  const origin = new URL(baseURL ?? '').origin;
  const outside: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    if (/^(blob|data):/.test(url)) return;
    if (new URL(url).origin !== origin) outside.push(url);
  });

  await page.goto('./#/tools/merge');
  await expect(page.getByText('Being built right now')).toHaveCount(0);
  await page.getByTestId('file-input').setInputFiles([pdf('first.pdf', 2)]);
  await expect(page.getByRole('button', { name: 'Merge PDFs' })).toBeDisabled();

  await page.getByTestId('file-input').setInputFiles([pdf('second.pdf', 3)]);
  await page.getByRole('button', { name: 'Merge 2 PDFs' }).click();

  const heading = page.getByRole('heading', { name: 'Your PDF is ready' });
  await expect(heading).toBeVisible({ timeout: 15_000 });
  await expect(heading).toBeFocused();
  await expect(page.getByText('first-merged.pdf')).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Download PDF' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('first-merged.pdf');
  const merged = await PDFDocument.load(await readFile(await download.path()));
  expect(merged.getPageCount()).toBe(5);

  // Back to the list keeps the files; starting over clears them.
  await page.getByRole('button', { name: 'Change the order' }).click();
  await expect(page.getByTestId('file-row')).toHaveCount(2);
  await page.getByRole('button', { name: 'Merge 2 PDFs' }).click();
  await page.getByRole('button', { name: 'Merge other PDFs' }).click();
  await expect(page.getByRole('button', { name: 'Choose PDFs' })).toBeVisible();

  expect(outside).toEqual([]);
});

test('a broken file gets a clear message and a way back', async ({ page }) => {
  await page.goto('./#/tools/merge');
  await page
    .getByTestId('file-input')
    .setInputFiles([
      pdf('fine.pdf'),
      { name: 'broken.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 nope') },
    ]);
  await page.getByRole('button', { name: 'Merge 2 PDFs' }).click();

  const alert = page.getByRole('alert');
  await expect(alert).toContainText('broken.pdf could not be read', { timeout: 15_000 });
  await page.getByRole('button', { name: 'Back to your files' }).click();
  await page.getByRole('button', { name: 'Remove broken.pdf' }).click();
  await expect(page.getByRole('button', { name: 'Merge PDFs' })).toBeDisabled();
});
