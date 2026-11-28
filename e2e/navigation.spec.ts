import { expect, test } from '@playwright/test';

test('opens a tool from the home page and comes back', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('link', { name: 'Merge PDF' }).click();
  await expect(page).toHaveURL(/#\/tools\/merge$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Merge PDF' })).toBeVisible();
  await expect(page).toHaveTitle('Merge PDF | PDFPip');

  await page.getByRole('link', { name: /pdfpip, home/i }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: /every pdf and image tool you need/i }),
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
    page.getByRole('heading', { level: 1, name: /every pdf and image tool you need/i }),
  ).toBeVisible();
});

test('a mistyped tool link offers the right tool', async ({ page }) => {
  await page.goto('./#/tools/spilt');
  await page.getByRole('button', { name: 'Unfold the crumpled page' }).click();
  await expect(page.getByText('Found the way back.')).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Did you mean' })
    .getByRole('link', { name: 'Split PDF' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Split PDF' })).toBeVisible();
});
