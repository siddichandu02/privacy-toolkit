import { expect, test } from '@playwright/test';

test('opens a tool from the home page and comes back', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('link', { name: 'Merge PDF' }).click();
  await expect(page).toHaveURL(/#\/tools\/merge$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Merge PDF' })).toBeVisible();
  await expect(page).toHaveTitle('Merge PDF | Privacy Toolkit');

  await page.getByRole('link', { name: /privacy toolkit, home/i }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: /edit pdfs and images without uploading/i }),
  ).toBeVisible();
});

test('tool pages load directly from a shared link', async ({ page }) => {
  await page.goto('./#/tools/exif');
  await expect(page.getByRole('heading', { level: 1, name: 'Remove EXIF' })).toBeVisible();
});

test('unknown links show a friendly not found page', async ({ page }) => {
  await page.goto('./#/somewhere/else');
  await expect(page.getByRole('heading', { level: 1, name: /folded itself away/i })).toBeVisible();
  await page.getByRole('link', { name: /back to all tools/i }).click();
  await expect(page).toHaveURL(/#\/$/);
});

test('skip link is the first tab stop', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard only');
  await page.goto('./');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: /skip to content/i });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
});

test('back button returns to the previous page', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('link', { name: 'Sign PDF' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Sign PDF' })).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole('heading', { level: 1, name: /edit pdfs and images without uploading/i }),
  ).toBeVisible();
});
