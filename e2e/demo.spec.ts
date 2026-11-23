import { expect, test } from '@playwright/test';

const kb = (text: string) => {
  const [value, unit] = text.trim().split(' ');
  const n = Number(value);
  return unit === 'MB' ? n * 1024 : unit === 'B' ? n / 1024 : n;
};

test('the compression demo really compresses, and stronger means smaller', async ({ page }) => {
  await page.goto('./');
  const demo = page.locator('section[aria-labelledby="demo-heading"]');
  await demo.scrollIntoViewIfNeeded();

  const before = demo.getByTestId('demo-before-size');
  const after = demo.getByTestId('demo-after-size');
  await expect(after).toHaveText(/\d/);
  await expect(before).toHaveText(/\d/);
  const balanced = kb(await after.innerText());
  expect(balanced).toBeLessThan(kb(await before.innerText()));
  await expect(demo.getByTestId('demo-saved')).toHaveText(/\d+% smaller/);

  await demo.getByText('Strong', { exact: true }).click();
  await expect.poll(async () => kb(await after.innerText())).toBeLessThan(balanced);
});

test('the compare line moves with the slider and the keyboard', async ({ page }) => {
  await page.goto('./');
  const slider = page.getByRole('slider', { name: 'Compare original and compressed' });
  await slider.scrollIntoViewIfNeeded();
  await slider.fill('20');
  await expect(page.getByTestId('demo-after')).toHaveCSS('clip-path', 'inset(0px 0px 0px 20%)');
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await expect(slider).toHaveValue('21');
});

test('the demo leads to the real tool', async ({ page }) => {
  await page.goto('./');
  const link = page.getByRole('link', { name: 'Compress your own photos' });
  await link.scrollIntoViewIfNeeded();
  await link.click();
  await expect(page).toHaveURL(/#\/tools\/compress-image$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Compress image' })).toBeVisible();
});
