import { expect, test } from '@playwright/test';
import { makePdf } from './make-pdf';

const pdf = (name: string, pages = 1) => ({
  name,
  mimeType: 'application/pdf',
  buffer: makePdf(pages, name),
});

test('a file dropped on the home page opens in the picked tool', async ({ page }) => {
  await page.goto('./');
  const zone = page.getByTestId('hero-drop');
  // Drag two real PDFs over the zone, then drop them.
  const data = await page.evaluateHandle(
    async (files) => {
      const dt = new DataTransfer();
      for (const f of files) {
        const bytes = Uint8Array.from(atob(f.b64), (c) => c.charCodeAt(0));
        dt.items.add(new File([bytes], f.name, { type: 'application/pdf' }));
      }
      return dt;
    },
    [pdf('one.pdf'), pdf('two.pdf', 2)].map((f) => ({
      name: f.name,
      b64: Buffer.from(f.buffer).toString('base64'),
    })),
  );
  await zone.dispatchEvent('dragenter', { dataTransfer: data });
  await expect(zone).toHaveAttribute('data-dragging', 'true');
  await zone.dispatchEvent('drop', { dataTransfer: data });

  const group = page.getByRole('group', { name: 'What should we do with it?' });
  await expect(group.getByText(/2 PDFs/)).toBeVisible();
  await group.getByRole('button', { name: /Merge PDF/ }).click();

  await expect(page).toHaveURL(/#\/tools\/merge$/);
  await expect(page.getByTestId('file-row')).toHaveCount(2);
});

test('single-file tools take just the first file', async ({ page }) => {
  await page.goto('./');
  await page.getByTestId('hero-file-input').setInputFiles([pdf('a.pdf'), pdf('b.pdf')]);
  await page.getByRole('button', { name: /Split PDF/ }).click();
  await expect(page.getByTestId('file-row')).toHaveCount(1);
  await expect(page.getByTestId('file-row')).toContainText('a.pdf');
});

test('the hero story and the tool grid heading fit on a laptop screen', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'desktop layout only');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('./');
  const story = await page.getByTestId('hero-story').boundingBox();
  expect((story?.y ?? 9999) + (story?.height ?? 0)).toBeLessThan(800);
  const heading = await page.getByRole('heading', { name: 'Or pick a tool' }).boundingBox();
  expect(heading?.y ?? 9999).toBeLessThan(800 - 40);
});

/** A DataTransfer holding real PDFs, built inside the page. */
async function pdfTransfer(page: import('@playwright/test').Page, names: string[]) {
  return page.evaluateHandle(
    async (files) => {
      const dt = new DataTransfer();
      for (const f of files) {
        const bytes = Uint8Array.from(atob(f.b64), (c) => c.charCodeAt(0));
        dt.items.add(new File([bytes], f.name, { type: 'application/pdf' }));
      }
      return dt;
    },
    names.map((name) => ({ name, b64: Buffer.from(makePdf(1, name)).toString('base64') })),
  );
}

test('dragging a PDF anywhere lights up the tools that can open it', async ({ page }) => {
  await page.goto('./');
  const data = await pdfTransfer(page, ['a.pdf']);
  await page.locator('body').dispatchEvent('dragenter', { dataTransfer: data });
  await page.locator('body').dispatchEvent('dragover', { dataTransfer: data });

  await expect(page.getByTestId('page-drop')).toContainText(/drop the pdf on a glowing card/i);
  const card = (name: string) =>
    page.locator('[data-drag]').filter({ has: page.getByRole('link', { name }) });
  await expect(card('Merge PDF')).toHaveAttribute('data-drag', 'takes');
  await expect(card('Images to PDF')).toHaveAttribute('data-drag', 'skips');
  // Real drags send dragover all the time; without them the page lets go after 600 ms.
  await page.locator('body').dispatchEvent('dragover', { dataTransfer: data });
  await expect(card('Merge PDF').getByTestId('ready-halo')).toHaveCount(1);
  await expect(card('Images to PDF').getByTestId('ready-halo')).toHaveCount(0);

  // Let go on the Split card: it opens with the file.
  const split = page.getByRole('link', { name: 'Split PDF' });
  await split.dispatchEvent('dragover', { dataTransfer: data });
  await split.dispatchEvent('drop', { dataTransfer: data });
  await expect(page).toHaveURL(/#\/tools\/split$/);
  await expect(page.getByTestId('file-row')).toHaveCount(1);
});

test('a file dropped on an empty part of the page lands in the hero', async ({ page }) => {
  await page.goto('./');
  const data = await pdfTransfer(page, ['a.pdf', 'b.pdf']);
  const heading = page.getByRole('heading', { name: 'Or pick a tool' });
  await heading.dispatchEvent('dragenter', { dataTransfer: data });
  await heading.dispatchEvent('drop', { dataTransfer: data });

  await expect(page.getByTestId('page-drop')).toHaveCount(0);
  const group = page.getByRole('group', { name: 'What should we do with it?' });
  await expect(group.getByText(/2 PDFs/)).toBeVisible();
  await expect(page.locator('[data-drag="idle"]').first()).toBeVisible();
});
