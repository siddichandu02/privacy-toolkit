import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import { makePdf } from './make-pdf';

const pdf = (name: string, pages: number) => ({
  name,
  mimeType: 'application/pdf',
  buffer: makePdf(pages, name),
});

test('turns and removes pages on the device', async ({ page, baseURL }) => {
  const origin = new URL(baseURL ?? '').origin;
  const outside: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    if (/^(blob|data):/.test(url)) return;
    if (new URL(url).origin !== origin) outside.push(url);
  });

  await page.goto('./#/tools/rotate');
  await expect(page.getByText('Being built right now')).toHaveCount(0);
  await page.getByTestId('file-input').setInputFiles([pdf('scan.pdf', 4)]);

  const tiles = page.getByTestId('turn-tile');
  await expect(tiles).toHaveCount(4, { timeout: 15_000 });
  const save = page.getByRole('button', { name: 'Save PDF' });
  await expect(save).toBeDisabled();

  await page.getByRole('button', { name: 'Turn page 1 right' }).click();
  await expect(tiles.nth(0)).toHaveAttribute('data-angle', '90');

  // Keyboard: Shift+R turns left, Delete removes.
  await tiles.nth(1).focus();
  await page.keyboard.press('Shift+R');
  await expect(tiles.nth(1)).toHaveAttribute('data-angle', '270');
  await tiles.nth(3).focus();
  await page.keyboard.press('Delete');
  await expect(tiles.nth(3)).toHaveAttribute('data-removed', 'true');
  await expect(page.getByText('The new PDF has 3 pages. scan.pdf stays as it is.')).toBeVisible();

  await save.click();
  const heading = page.getByRole('heading', { name: 'Your PDF is ready' });
  await expect(heading).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('3 pages, 2 turned, 1 removed', { exact: false })).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Download PDF' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('scan-rotated.pdf');
  const out = await PDFDocument.load(await readFile(await download.path()));
  expect(out.getPages().map((p) => p.getRotation().angle)).toEqual([90, 270, 0]);

  // Keep editing brings the grid back as it was.
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page.getByTestId('turn-tile').nth(3)).toHaveAttribute('data-removed', 'true');
  expect(outside).toEqual([]);
});

test('will not save a PDF with every page removed', async ({ page }) => {
  await page.goto('./#/tools/rotate');
  await page.getByTestId('file-input').setInputFiles([pdf('two.pdf', 2)]);
  await expect(page.getByTestId('turn-tile')).toHaveCount(2, { timeout: 15_000 });
  await page.getByRole('button', { name: 'Remove page 1' }).click();
  await page.getByRole('button', { name: 'Remove page 2' }).click();
  await expect(page.getByText('Keep at least one page. A PDF cannot be empty.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save PDF' })).toBeDisabled();
  await page.getByRole('button', { name: 'Undo all' }).click();
  await expect(page.getByRole('button', { name: 'Remove page 1' })).toBeVisible();
});
