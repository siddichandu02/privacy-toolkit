import { expect, test } from '@playwright/test';
import JSZip from 'jszip';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import { makePdf } from './make-pdf';

/** Page count of every PDF in a zip, by file name. */
async function zipPages(path: string): Promise<Record<string, number>> {
  const zip = await JSZip.loadAsync(await readFile(path));
  const out: Record<string, number> = {};
  for (const [name, entry] of Object.entries(zip.files)) {
    const doc = await PDFDocument.load(await entry.async('uint8array'));
    out[name] = doc.getPageCount();
  }
  return out;
}

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

  // The preview shows the one file that will come out.
  await expect(page.getByTestId('output-file')).toHaveCount(1);
  await expect(page.getByTestId('output-file')).toContainText('report-extract.pdf');

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

test('split into parts: each range becomes its own PDF', async ({ page }) => {
  await page.goto('./#/tools/split');
  await page.getByTestId('file-input').setInputFiles([pdf('book.pdf', 7)]);
  await expect(page.getByTestId('page-tile')).toHaveCount(7, { timeout: 15_000 });

  await page.getByText('Split into parts').click();
  const ranges = page.getByLabel('Ranges, one file each');

  // One range alone would just be an extract, so it asks for another.
  await ranges.fill('1-3');
  await expect(page.getByTestId('lone-part-hint')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Split PDF' })).toBeDisabled();

  // Pages picked on the grid join the ranges as a new part.
  const tiles = page.getByTestId('page-tile');
  await tiles.nth(4).click();
  await tiles.nth(5).click({ modifiers: ['Shift'] });
  await expect(ranges).toHaveValue('1-3, 5-6');
  await expect(page.getByTestId('page-group')).toHaveCount(5);
  const cards = page.getByTestId('output-file');
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toContainText('book-part-1.pdf');
  await expect(cards.nth(1)).toContainText('pages 5-6');

  await page.getByRole('button', { name: 'Split into 2 PDFs' }).click();
  await expect(page.getByRole('heading', { name: 'Your PDFs are ready' })).toBeVisible({
    timeout: 15_000,
  });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Download zip' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('book-parts.zip');
  expect(await zipPages(await download.path())).toEqual({
    'book-part-1.pdf': 3,
    'book-part-2.pdf': 2,
  });

  // One part can be saved on its own from the list.
  const [single] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Save book-part-2.pdf' }).click(),
  ]);
  expect(single.suggestedFilename()).toBe('book-part-2.pdf');
  const part = await PDFDocument.load(await readFile(await single.path()));
  expect(part.getPageCount()).toBe(2);
});

test('split into parts with the equal parts preset', async ({ page }) => {
  await page.goto('./#/tools/split');
  await page.getByTestId('file-input').setInputFiles([pdf('notes.pdf', 10)]);
  await expect(page.getByTestId('page-tile')).toHaveCount(10, { timeout: 15_000 });

  await page.getByText('Split into parts').click();
  await page.getByRole('button', { name: 'Into 2 equal parts' }).click();
  await page.getByRole('button', { name: 'More' }).click();
  await expect(page.getByLabel('Ranges, one file each')).toHaveValue('1-4, 5-7, 8-10');
  await expect(page.getByTestId('output-file')).toHaveCount(3);

  await page.getByRole('button', { name: 'Split into 3 PDFs' }).click();
  await expect(page.getByRole('heading', { name: 'Your PDFs are ready' })).toBeVisible({
    timeout: 15_000,
  });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Download zip' }).click(),
  ]);
  expect(await zipPages(await download.path())).toEqual({
    'notes-part-1.pdf': 4,
    'notes-part-2.pdf': 3,
    'notes-part-3.pdf': 3,
  });
});

test('split every page: one PDF per page in one click', async ({ page }) => {
  await page.goto('./#/tools/split');
  await page.getByTestId('file-input').setInputFiles([pdf('deck.pdf', 4)]);
  await expect(page.getByTestId('page-tile')).toHaveCount(4, { timeout: 15_000 });

  await page.getByText('Split every page').click();
  await expect(page.getByTestId('output-file')).toHaveCount(4);
  await expect(page.getByTestId('split-out-summary')).toHaveText(
    '4 PDFs, packed in deck-pages.zip.',
  );
  await page.getByRole('button', { name: 'Split into 4 PDFs' }).click();
  await expect(page.getByRole('heading', { name: 'Your PDFs are ready' })).toBeVisible({
    timeout: 15_000,
  });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Download zip' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('deck-pages.zip');
  expect(await zipPages(await download.path())).toEqual({
    'deck-page-1.pdf': 1,
    'deck-page-2.pdf': 1,
    'deck-page-3.pdf': 1,
    'deck-page-4.pdf': 1,
  });
});
