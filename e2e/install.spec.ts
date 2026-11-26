import { expect, test } from '@playwright/test';

/** Stand in for the browser's own install offer, which headless browsers never make. */
async function offerInstall(page: import('@playwright/test').Page, outcome: string) {
  await page.evaluate((outcome) => {
    const e = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: string }>;
    };
    e.prompt = async () => {
      (window as unknown as { prompted: boolean }).prompted = true;
    };
    e.userChoice = Promise.resolve({ outcome });
    window.dispatchEvent(e);
  }, outcome);
}

test('home offers to install the app once the browser allows it', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('install-slip')).toHaveCount(0);
  await offerInstall(page, 'accepted');
  const slip = page.getByTestId('install-slip');
  await slip.scrollIntoViewIfNeeded();
  await expect(slip).toBeVisible();
  await slip.getByRole('button', { name: /Install app|Add to home screen/ }).click();
  await expect(slip.getByRole('heading', { name: 'Added' })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { prompted?: boolean }).prompted)).toBe(
    true,
  );
});

test('"Not now" keeps the offer away after a reload', async ({ page }) => {
  await page.goto('./');
  await offerInstall(page, 'accepted');
  await page.getByTestId('install-slip').getByRole('button', { name: 'Not now' }).click();
  await expect(page.getByTestId('install-slip')).toHaveCount(0);
  await page.reload();
  await offerInstall(page, 'accepted');
  await expect(page.getByTestId('install-slip')).toHaveCount(0);
});

test('the command palette still installs it after "Not now"', async ({ page }) => {
  await page.goto('./');
  await offerInstall(page, 'accepted');
  await page.getByTestId('install-slip').getByRole('button', { name: 'Not now' }).click();
  await expect(page.getByTestId('install-slip')).toHaveCount(0);
  await page.keyboard.press('ControlOrMeta+k');
  await page.getByRole('combobox', { name: 'Search tools and actions' }).fill('install');
  await page.getByRole('option', { name: /Install the app/ }).click();
  await expect(page.getByText('Added to your apps')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { prompted?: boolean }).prompted)).toBe(
    true,
  );
});
