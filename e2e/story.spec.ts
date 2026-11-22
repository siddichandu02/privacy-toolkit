import { expect, test } from '@playwright/test';
import { makePdf } from './make-pdf';

// The real story timing, not the shortcut the other specs use.
test.use({ storageState: { cookies: [], origins: [] } });

const pdf = (name: string) => ({ name, mimeType: 'application/pdf', buffer: makePdf(1, name) });

async function startMerge(page: import('@playwright/test').Page) {
  await page.goto('./#/tools/merge');
  await page.getByTestId('file-input').setInputFiles([pdf('a.pdf'), pdf('b.pdf')]);
  // Like a person would, look at the list first; its previews feed the scene.
  await expect(page.locator('main img[src^="blob:"]')).toHaveCount(2, { timeout: 20_000 });
  await page.getByRole('button', { name: 'Merge 2 PDFs' }).click();
  return Date.now();
}

test('the story plays for a few seconds before the result', async ({ page }) => {
  const clicked = await startMerge(page);
  const stage = page.getByRole('region', { name: 'Merging 2 PDFs' });
  await expect(stage).toBeVisible();
  const done = page.getByRole('heading', { name: 'Your PDF is ready' });

  // The merge itself takes well under a second; the story keeps going.
  await page.waitForTimeout(Math.max(0, clicked + 3000 - Date.now()));
  await expect(stage).toBeVisible();
  await expect(done).toHaveCount(0);
  await expect(page.getByRole('button', { name: /skip/i })).toBeVisible();

  // The user's own first pages are drawn into the scene.
  await expect(page.locator('[data-testid="jar-scene"] image[href^="blob:"]').first()).toBeAttached(
    { timeout: 3000 },
  );

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
  const clicked = await startMerge(page);
  await expect(page.getByRole('heading', { name: 'Your PDF is ready' })).toBeVisible({
    timeout: 5000,
  });
  // 1.5 s of calm story plus a little slack for a busy machine.
  expect(Date.now() - clicked).toBeLessThan(4500);
});

test('the helpers stand up in 3D while the story plays', async ({ page }) => {
  await page.goto('./');
  const webgl = await page.evaluate(() => {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') ?? c.getContext('webgl'));
  });
  test.skip(!webgl, 'this browser has no WebGL; the flat helpers are covered elsewhere');

  await startMerge(page);
  const scene = page.getByTestId('jar-scene');
  await expect(scene.getByTestId('helpers-3d').locator('canvas')).toBeAttached({ timeout: 5000 });
  // Three helpers in the merge scene, each followed by a 3D figure; the flat drawings step aside.
  await expect(scene.locator('[data-helper-anchor]')).toHaveCount(3);
  await expect(scene.locator('[data-part="helper"] > g > g[opacity="0"]').first()).toBeAttached();
  // No extra downloads from other sites for the 3D layer.
  const outside = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .map((e) => e.name)
      .filter((n) => !n.startsWith(location.origin) && !/^(blob|data):/.test(n)),
  );
  expect(outside).toEqual([]);
});
