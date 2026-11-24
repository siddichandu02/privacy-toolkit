import { expect, test } from '@playwright/test';

const palette = (page: import('@playwright/test').Page) =>
  page.getByRole('dialog', { name: /search tools and actions/i });

test('the header search opens a tool and remembers it', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Search tools' }).click();
  await expect(palette(page)).toBeVisible();
  await palette(page).getByRole('combobox').fill('passport');
  await palette(page)
    .getByRole('option', { name: /resize and crop/i })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Resize and crop' })).toBeVisible();
  await expect(palette(page)).toBeHidden();

  // After a reload the tool is listed first, under "Opened lately".
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Resize and crop' })).toBeVisible();
  await page.getByRole('button', { name: 'Search tools' }).click();
  await expect(palette(page).getByText('Opened lately')).toBeVisible();
  await expect(palette(page).getByRole('option').first()).toContainText('Resize and crop');
});

test('works from the keyboard alone', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard only');
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.keyboard.press('Control+k');
  const input = palette(page).getByRole('combobox');
  await expect(input).toBeFocused();
  await page.keyboard.type('sig');
  await expect(palette(page).getByRole('option', { selected: true })).toContainText('Sign PDF');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/tools\/sign$/);

  await page.keyboard.press('Control+k');
  await page.keyboard.press('Escape');
  await expect(palette(page)).toBeHidden();

  await page.keyboard.press('?');
  const sheet = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(sheet).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
});

test('locks page scroll while open and fits a phone screen', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Search tools' }).click();
  await expect(palette(page)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('hidden');
  const box = await palette(page).boundingBox();
  const width = page.viewportSize()?.width ?? 0;
  expect(box && box.x >= 0 && box.x + box.width <= width).toBe(true);
  await page.mouse.click(5, (page.viewportSize()?.height ?? 600) - 5);
  await expect(palette(page)).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
});

test('the home page lists tools opened lately', async ({ page }) => {
  await page.goto('./#/tools/exif');
  await expect(page.getByRole('heading', { level: 1, name: 'Remove EXIF' })).toBeVisible();
  await page.getByRole('link', { name: /privacy toolkit, home/i }).click();
  const recent = page.getByRole('navigation', { name: 'Opened lately' });
  await expect(recent.getByRole('link', { name: 'Remove EXIF' })).toBeVisible();
  await recent.getByRole('button', { name: /clear/i }).click();
  await expect(recent).toBeHidden();
});
