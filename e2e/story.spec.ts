import { expect, test } from '@playwright/test';
import { makePdf } from './make-pdf';

// The real story timing, not the shortcut the other specs use.
test.use({ storageState: { cookies: [], origins: [] } });

const pdf = (name: string) => ({ name, mimeType: 'application/pdf', buffer: makePdf(1, name) });

async function startMerge(page: import('@playwright/test').Page) {
  await page.goto('./#/tools/merge');
  await page.getByTestId('file-input').setInputFiles([pdf('a.pdf'), pdf('b.pdf')]);
  await page.getByRole('button', { name: 'Merge 2 PDFs' }).click();
}

test('the story plays for a few seconds before the result', async ({ page }) => {
  await startMerge(page);
  const stage = page.getByRole('region', { name: 'Merging 2 PDFs' });
  await expect(stage).toBeVisible();
  const done = page.getByRole('heading', { name: 'Your PDF is ready' });

  // The merge itself takes well under a second; the story keeps going.
  await page.waitForTimeout(3000);
  await expect(stage).toBeVisible();
  await expect(done).toHaveCount(0);
  await expect(page.getByRole('button', { name: /skip/i })).toBeVisible();

  await expect(done).toBeVisible({ timeout: 10_000 });
});

test('skip jumps straight to the result', async ({ page }) => {
  await startMerge(page);
  const skip = page.getByRole('button', { name: /skip/i });
  await expect(skip).toBeVisible({ timeout: 4000 });
  await skip.click();
  await expect(page.getByRole('heading', { name: 'Your PDF is ready' })).toBeVisible({
    timeout: 2000,
  });
});

test('reduced motion gets a short calm version', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const started = Date.now();
  await startMerge(page);
  await expect(page.getByRole('heading', { name: 'Your PDF is ready' })).toBeVisible({
    timeout: 5000,
  });
  expect(Date.now() - started).toBeLessThan(5000);
});
