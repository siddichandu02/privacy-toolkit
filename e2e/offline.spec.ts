import { expect, test } from '@playwright/test';
import { makePdf } from './make-pdf';

test.use({ serviceWorkers: 'allow' });

const pdf = (name: string, pages = 1) => ({
  name,
  mimeType: 'application/pdf',
  buffer: makePdf(pages, name),
});

test('after one visit the app opens and merges with no connection', async ({ page, context }) => {
  await page.goto('./');
  // Wait until the offline copy is stored and in charge of this page.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r));
  });

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('right in your browser');

  // A tool that was never opened online: its page, worker and pdf.js all come from the copy.
  await page.goto('./#/tools/merge');
  await page.getByTestId('file-input').setInputFiles([pdf('a.pdf', 1), pdf('b.pdf', 2)]);
  await page.getByRole('button', { name: 'Merge 2 PDFs' }).click();
  await expect(page.getByRole('heading', { name: 'Your PDF is ready' })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText(/2 files joined, 3 pages/)).toBeVisible();
});

test('can be installed: manifest and icons are served', async ({ page, request }) => {
  await page.goto('./');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const res = await request.get(new URL(href ?? '', page.url()).href);
  expect(res.ok()).toBe(true);
  const manifest = (await res.json()) as {
    display: string;
    icons: { src: string; purpose: string }[];
    start_url: string;
  };
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.map((i) => i.purpose)).toContain('maskable');
  for (const icon of manifest.icons) {
    const file = await request.get(new URL(icon.src, res.url()).href);
    expect(file.headers()['content-type']).toContain('image/png');
  }
});
