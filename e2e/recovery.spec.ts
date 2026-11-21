import { expect, test, type Page } from '@playwright/test';
import { makePng } from '../src/test/make-image';
import { makePdf } from './make-pdf';

const pdf = (name: string, pages = 1) => ({
  name,
  mimeType: 'application/pdf',
  buffer: makePdf(pages, name),
});

interface Tool {
  name: string;
  path: string;
  worker: string;
  /** Add files and settings, then return the button that starts the job. */
  prepare: (page: Page) => Promise<ReturnType<Page['getByRole']>>;
}

const TOOLS: Tool[] = [
  {
    name: 'merge',
    path: 'merge',
    worker: 'merge',
    prepare: async (page) => {
      await page.getByTestId('file-input').setInputFiles([pdf('a.pdf'), pdf('b.pdf', 2)]);
      return page.getByRole('button', { name: 'Merge 2 PDFs' });
    },
  },
  {
    name: 'split',
    path: 'split',
    worker: 'split',
    prepare: async (page) => {
      await page.getByTestId('file-input').setInputFiles([pdf('book.pdf', 3)]);
      await expect(page.getByTestId('page-tile')).toHaveCount(3, { timeout: 15_000 });
      await page.getByLabel('Pages to keep').fill('1-2');
      return page.getByRole('button', { name: 'Extract 2 pages' });
    },
  },
  {
    name: 'rotate',
    path: 'rotate',
    worker: 'rotate',
    prepare: async (page) => {
      await page.getByTestId('file-input').setInputFiles([pdf('scan.pdf', 2)]);
      await page.getByRole('button', { name: 'Turn page 1 right' }).click({ timeout: 15_000 });
      return page.getByRole('button', { name: 'Save PDF' });
    },
  },
  {
    name: 'images to pdf',
    path: 'images-to-pdf',
    worker: 'images',
    prepare: async (page) => {
      await page
        .getByTestId('file-input')
        .setInputFiles([
          { name: 'p.png', mimeType: 'image/png', buffer: Buffer.from(makePng(40, 30)) },
        ]);
      return page.getByRole('button', { name: 'Make PDF' });
    },
  },
  {
    name: 'sign',
    path: 'sign',
    worker: 'sign',
    prepare: async (page) => {
      await page.getByTestId('file-input').setInputFiles([pdf('form.pdf', 2)]);
      await expect(page.getByText('Page 1 of 2')).toBeVisible({ timeout: 15_000 });
      await page.getByText('Type', { exact: true }).click();
      await page.getByLabel('Your name').fill('Alex Morgan');
      return page.getByRole('button', { name: 'Sign PDF' });
    },
  },
  {
    name: 'compress',
    path: 'compress-pdf',
    worker: 'compress',
    prepare: async (page) => {
      await page.getByTestId('file-input').setInputFiles([pdf('notes.pdf', 2)]);
      return page.getByRole('button', { name: 'Compress PDF' });
    },
  },
];

const finished = (page: Page) =>
  page.getByRole('heading', { name: /is ready|is smaller|already lean/ });

/** Make the tool's worker file vanish, as it does when a deploy replaces the site. */
const loseWorker = (page: Page, worker: string) =>
  page.route(new RegExp(String.raw`/${worker}\.worker-[\w-]+\.js`), (route) =>
    route.fulfill({ status: 404, body: 'Not found' }),
  );

/** Answer the app's version check with a page that names a newer entry script. */
const announceNewVersion = (page: Page) =>
  page.route(/\/privacy-toolkit\/\?check=/, async (route) => {
    const res = await route.fetch();
    const html = (await res.text()).replace(/assets\/index-[\w-]+\.js/, 'assets/index-NEWER123.js');
    await route.fulfill({ response: res, body: html });
  });

for (const tool of TOOLS) {
  test.describe(tool.name, () => {
    test('a failed run never sticks: try again works in the same session', async ({ page }) => {
      await page.goto(`./#/tools/${tool.path}`);
      await loseWorker(page, tool.worker);
      await (await tool.prepare(page)).click();
      await expect(page.getByRole('alert')).toBeVisible({ timeout: 15_000 });

      await page.unrouteAll();
      await page.getByRole('button', { name: 'Try again' }).click();
      await expect(finished(page)).toBeVisible({ timeout: 15_000 });
    });

    test('after a deploy it asks for a reload, and the reload works', async ({ page }) => {
      await page.goto(`./#/tools/${tool.path}`);
      await loseWorker(page, tool.worker);
      await announceNewVersion(page);
      await (await tool.prepare(page)).click();

      await expect(page.getByRole('heading', { name: 'A newer version is ready' })).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);

      await page.unrouteAll();
      // Wait for the new page itself; the old one is already "loaded".
      await Promise.all([
        page.waitForEvent('load'),
        page.getByRole('button', { name: 'Reload page' }).click(),
      ]);
      await (await tool.prepare(page)).click();
      await expect(finished(page)).toBeVisible({ timeout: 15_000 });
    });
  });
}

test('merge recovers from a broken file without a reload', async ({ page }) => {
  await page.goto('./#/tools/merge');
  await page
    .getByTestId('file-input')
    .setInputFiles([
      pdf('fine.pdf'),
      { name: 'broken.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 nope') },
    ]);
  await page.getByRole('button', { name: 'Merge 2 PDFs' }).click();
  await expect(page.getByRole('alert')).toContainText('broken.pdf', { timeout: 15_000 });

  await page.getByRole('button', { name: 'Back to your files' }).click();
  await page.getByRole('button', { name: 'Remove broken.pdf' }).click();
  await page.getByTestId('file-input').setInputFiles([pdf('also-fine.pdf', 2)]);
  await page.getByRole('button', { name: 'Merge 2 PDFs' }).click();
  await expect(page.getByText(/2 files joined, 3 pages/)).toBeVisible({ timeout: 15_000 });
});
