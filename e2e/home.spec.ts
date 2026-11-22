import { expect, test } from '@playwright/test';

test('home page shows the privacy promise', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle('Privacy Toolkit');
  await expect(
    page.getByRole('heading', { level: 1, name: /every pdf and image tool you need/i }),
  ).toBeVisible();
});

test('makes no requests to third-party hosts', async ({ page, baseURL }) => {
  const origin = new URL(baseURL ?? '').origin;
  const external: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    // blob: and data: URLs are made in the page itself and never touch the network.
    const local = url.startsWith('data:') || url.startsWith('blob:');
    if (!url.startsWith(origin) && !local) external.push(url);
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

test('theme choice survives a reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: /switch to light theme/i }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  // Set by the inline script, so it is already correct before the app mounts.
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('button', { name: /switch to dark theme/i })).toBeVisible();
});

test('follows a light system preference on first visit', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('the file story plays on its own in the hero and reads zero bytes sent', async ({ page }) => {
  await page.goto('./');
  const story = page.getByTestId('hero-story');
  await expect(story).toBeInViewport();
  const steps = story.getByRole('list', { name: 'Three steps' }).getByRole('listitem');
  await expect(steps).toHaveCount(3);
  await expect(steps.nth(0)).toHaveAttribute('aria-current', 'step');
  // Nobody scrolls or clicks: it moves on by itself and comes back round.
  await expect(steps.nth(1)).toHaveAttribute('aria-current', 'step', { timeout: 6000 });
  await expect(steps.nth(2)).toHaveAttribute('aria-current', 'step', { timeout: 6000 });
  await expect(steps.nth(0)).toHaveAttribute('aria-current', 'step', { timeout: 6000 });
  await expect(story.getByTestId('story-sent').filter({ visible: true })).toHaveText('0 B sent');

  await story.getByRole('button', { name: 'Pause the story' }).click();
  await story.getByRole('button', { name: /Save the result/ }).click();
  await expect(story.locator('svg[data-step]')).toHaveAttribute('data-step', '2');
});
