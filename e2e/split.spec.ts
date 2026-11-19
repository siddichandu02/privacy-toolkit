import { expect, test } from '@playwright/test';
import JSZip from 'jszip';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import { makePdf } from './make-pdf';

const pdf = (name: string, pages: number) => ({
  name,
  mimeType: 'application/pdf',
  buffer: makePdf(pages, name),
});

test('extracts picked pages into one PDF on the device', async ({ page, baseURL }) => {
  const origin = new URL(baseURL ?? '').origin;
  const outside: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    if (/^(blob|data):/.test(url)) return;
    if (new URL(url).origin !== origin) outside.push(url);
  });

  await page.goto('./#/tools/split');
  await expect(page.getByText('Being built right now')).toHaveCount(0);
  await page.getByTestId('file-input').setInputFiles([pdf('report.pdf', 6)]);

  const tiles = page.getByTestId('page-tile');
  await expect(tiles).toHaveCount(6, { timeout: 15_000 });
  const input = page.getByLabel('Pages to keep');

  // Clicking tiles writes the ranges; shift-click fills the gap.
  await tiles.nth(1).click();
  await tiles.nth(3).click({ modifiers: ['Shift'] });
  await expect(input).toHaveValue('2-4');
  await expect(tiles.nth(2)).toHaveAttribute('aria-pressed', 'true');

  // Typing drives the tiles too, and bad input explains itself.
  await input.fill('2-4, 9');
  await expect(page.getByText('Page 9 is past the end. This PDF has 6 pages.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Split PDF' })).toBeDisabled();
  await input.fill('2-4, 6');
  await expect(tiles.nth(5)).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Extract 4 pages' }).click();
  const heading = page.getByRole('heading', { name: 'Your PDF is ready' });
  await expect(heading).toBeVisible({ timeout: 15_000 });
  await expect(heading).toBeFocused();
  await expect(page.getByText('report-extract.pdf')).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Download PDF' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('report-extract.pdf');
  const out = await PDFDocument.load(await readFile(await download.path()));
  expect(out.getPageCount()).toBe(4);

  // Back to picking keeps the file and the ranges.
  await page.getByRole('button', { name: 'Pick other pages' }).click();
  await expect(page.getByLabel('Pages to keep')).toHaveValue('2-4, 6');

  expect(outside).toEqual([]);
});

test('makes one PDF per range in a zip', async ({ page }) => {
  await page.goto('./#/tools/split');
  await page.getByTestId('file-input').setInputFiles([pdf('book.pdf', 5)]);
  await expect(page.getByTestId('page-tile')).toHaveCount(5, { timeout: 15_000 });

  await page.getByLabel('Pages to keep').fill('1-2, 5');
  await page.getByText('Separate PDFs').click();
  await expect(page.getByTestId('page-group')).toHaveCount(3);
  await page.getByRole('button', { name: 'Split into 2 PDFs' }).click();

  await expect(page.getByRole('heading', { name: 'Your PDFs are ready' })).toBeVisible({
    timeout: 15_000,
  });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Download zip' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('book-split.zip');
  const zip = await JSZip.loadAsync(await readFile(await download.path()));
  expect(Object.keys(zip.files).sort()).toEqual(['1-book-pages-1-2.pdf', '2-book-page-5.pdf']);
});
