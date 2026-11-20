import { expect, test } from '@playwright/test';

test('pip waves on the home page', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('svg[data-pose="wave"]:visible')).toHaveCount(1);
});

test('pip holds still with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  const pip = page.locator('svg[data-pose="wave"]:visible');
  await expect(pip).toHaveAttribute('data-animated', 'false');
});

test('lab page shows the wait screen progress', async ({ page }) => {
  await page.goto('./#/lab/pip');
  await expect(page.getByRole('heading', { level: 1, name: 'Pip lab' })).toBeVisible();
  const bar = page.getByRole('progressbar', { name: 'Merging 3 PDFs' });
  await expect(bar).toHaveAttribute('aria-valuenow', '40');
  await page.getByRole('slider', { name: 'Progress' }).fill('1');
  await expect(bar).toHaveAttribute('aria-valuenow', '100');
  // Every lab stage shares the slider; all of them reach the last step.
  const last = page.getByRole('listitem').filter({ hasText: 'Packing it up' });
  await expect(last).toHaveCount(6);
  for (const item of await last.all()) await expect(item).toHaveAttribute('aria-current', 'step');
  await expect(page.getByRole('progressbar', { name: 'Splitting report.pdf' })).toHaveAttribute(
    'aria-valuenow',
    '100',
  );
});

test('lab page has no horizontal scroll', async ({ page }) => {
  await page.goto('./#/lab/pip');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
