import { expect, test } from '@playwright/test';
import { makePdf } from './make-pdf';

const pdf = (name: string, pages = 1) => ({
  name,
  mimeType: 'application/pdf',
  buffer: makePdf(pages, name),
});

const rowNames = (page: import('@playwright/test').Page) =>
  page
    .getByTestId('file-row')
    .locator('p[title]')
    .evaluateAll((els) => els.map((el) => el.getAttribute('title')));

// The first pdf.js load parses a large worker, which is slow on busy CI machines.
test('merge page takes PDFs, shows page counts and thumbnails', async ({ page }) => {
  await page.goto('./#/tools/merge');
  await expect(page.getByRole('button', { name: 'Choose PDFs' })).toBeVisible();
  await page.getByTestId('file-input').setInputFiles([pdf('alpha.pdf', 3), pdf('beta.pdf')]);

  await expect(page.getByTestId('file-row')).toHaveCount(2);
  await expect(page.getByText(/, 3 pages$/)).toBeVisible();
  await expect(page.getByText(/, 1 page$/)).toBeVisible();
  // pdf.js drew the first page of each file.
  await expect(page.getByTestId('file-row').locator('img')).toHaveCount(2, { timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Add more PDFs' })).toBeVisible();
});

test('files can be reordered with the keyboard and removed', async ({ page }) => {
  await page.goto('./#/tools/merge');
  await page
    .getByTestId('file-input')
    .setInputFiles([pdf('one.pdf'), pdf('two.pdf'), pdf('three.pdf')]);
  await expect(page.getByTestId('file-row')).toHaveCount(3);

  await page.getByRole('button', { name: /reorder three\.pdf/i }).focus();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  expect(await rowNames(page)).toEqual(['three.pdf', 'one.pdf', 'two.pdf']);
  await expect(page.getByRole('status').filter({ hasText: 'moved' })).toHaveText(
    'three.pdf moved to position 1 of 3.',
  );

  await page.getByRole('button', { name: 'Remove one.pdf' }).click();
  await expect(page.getByTestId('file-row')).toHaveCount(2);
  await page.getByRole('button', { name: 'Remove all' }).click();
  await expect(page.getByRole('button', { name: 'Choose PDFs' })).toBeVisible();
});

test('wrong file types are explained, not added', async ({ page }) => {
  await page.goto('./#/tools/merge');
  await page
    .getByTestId('file-input')
    .setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hi') });
  await expect(page.getByText('notes.txt is not one of the PDFs this tool takes.')).toBeVisible();
  await expect(page.getByTestId('file-row')).toHaveCount(0);

  // The message stays when good files in the same batch switch to the list.
  await page
    .getByTestId('file-input')
    .setInputFiles([
      pdf('good.pdf'),
      { name: 'cat.png', mimeType: 'image/png', buffer: Buffer.from('png') },
    ]);
  await expect(page.getByTestId('file-row')).toHaveCount(1);
  await expect(page.getByText('cat.png is not one of the PDFs this tool takes.')).toBeVisible();
});

test('single file tools take one file at a time', async ({ page }) => {
  await page.goto('./#/tools/split');
  // The picker only allows one file here, but a drop can carry several.
  await page.getByRole('button', { name: 'Choose a PDF' }).evaluate((zone) => {
    const data = new DataTransfer();
    for (const name of ['only.pdf', 'extra.pdf']) {
      data.items.add(new File(['%PDF-1.4'], name, { type: 'application/pdf' }));
    }
    zone.dispatchEvent(
      new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: data }),
    );
  });
  await expect(page.getByTestId('file-row')).toHaveCount(1);
  await expect(
    page.getByText('extra.pdf was left out. This tool works on one file at a time.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /add more/i })).toHaveCount(0);
});

test('loading pdf.js makes no third-party requests', async ({ page, baseURL }) => {
  const origin = new URL(baseURL ?? '').origin;
  const external: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    if (!url.startsWith(origin) && !/^(data|blob):/.test(url)) external.push(url);
  });
  await page.goto('./#/tools/merge');
  await page.getByTestId('file-input').setInputFiles([pdf('alpha.pdf')]);
  await expect(page.getByTestId('file-row').locator('img')).toHaveCount(1, { timeout: 15_000 });
  expect(external).toEqual([]);
});
