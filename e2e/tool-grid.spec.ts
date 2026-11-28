import { expect, test } from '@playwright/test';

const grid = (page: import('@playwright/test').Page) =>
  page
    .getByRole('region', { name: /all tools/i })
    .getByRole('list')
    .getByRole('link');

test('search narrows the grid and can be reset', async ({ page }) => {
  await page.goto('./');
  await expect(grid(page)).toHaveCount(10);

  await page.getByRole('searchbox', { name: /search tools/i }).fill('compress');
  await expect(grid(page)).toHaveCount(2);

  await page.getByRole('searchbox').fill('teleport');
  await expect(page.getByRole('heading', { name: /no tool called/i })).toBeVisible();
  await page.getByRole('button', { name: /show all tools/i }).click();
  await expect(grid(page)).toHaveCount(10);
});

test('category filter shows only image tools', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('radio', { name: /image/i }).click();
  await expect(grid(page)).toHaveCount(4);
  await expect(grid(page).first()).toHaveAccessibleName('Compress image');
});

test('keyboard: slash to search, enter on a card opens it', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard only');
  await page.goto('./');
  await expect(page.getByRole('searchbox')).toBeVisible();
  await page.keyboard.press('/');
  await expect(page.getByRole('searchbox')).toBeFocused();
  await page.keyboard.type('sign');
  await expect(grid(page)).toHaveCount(1);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: /clear search/i })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(grid(page).first()).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/tools\/sign$/);
});

test('grid has no horizontal scroll on small screens', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('./');
  await page.getByRole('region', { name: /all tools/i }).scrollIntoViewIfNeeded();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
