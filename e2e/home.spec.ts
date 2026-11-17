import { expect, test } from '@playwright/test';

test('home page shows the privacy promise', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle('Privacy Toolkit');
  await expect(
    page.getByRole('heading', { level: 1, name: /your files stay on your device/i }),
  ).toBeVisible();
});

test('makes no requests to third-party hosts', async ({ page, baseURL }) => {
  const origin = new URL(baseURL ?? '').origin;
  const external: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    if (!url.startsWith(origin) && !url.startsWith('data:')) external.push(url);
  });
  await page.goto('./');
  await page.waitForLoadState('networkidle');
  expect(external).toEqual([]);
});

test('has no horizontal scroll', async ({ page }) => {
  await page.goto('./');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
