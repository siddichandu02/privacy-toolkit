import { expect, test } from '@playwright/test';
import { makePdf } from './make-pdf';

const pdf = (name: string, pages = 1) => ({
  name,
  mimeType: 'application/pdf',
  buffer: makePdf(pages, name),
});

test('home: the live check reads zero and lists this site as the only source', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'How can I check?' }).click();
  const proof = page.getByRole('region', { name: 'Privacy check' });
  await expect(proof.getByTestId('bytes-sent')).toHaveText('0');
  await expect(proof).toHaveAttribute('data-clean', 'true');
  await expect(proof.getByTestId('last-request')).toContainText('from this site');
  // A long file name in "Last request" must not widen the page on phones.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('merge still works with the connection off once files are in', async ({ page, context }) => {
  await page.goto('./#/tools/merge');
  await page.getByTestId('file-input').setInputFiles([pdf('a.pdf'), pdf('b.pdf', 2)]);
  // Give the tool a moment to get its worker ready, as a person reaching for the Wi-Fi would.
  await page.waitForLoadState('networkidle');
  await context.setOffline(true);

  await expect(page.getByRole('button', { name: /offline, still working/ })).toBeVisible();
  await page.getByRole('button', { name: 'Merge 2 PDFs' }).click();
  await expect(page.getByRole('heading', { name: /is ready/ })).toBeVisible({ timeout: 20_000 });

  await page.getByRole('button', { name: /0 bytes sent/ }).click();
  await expect(page.getByTestId('offline-tip')).toContainText("You're offline");
  await context.setOffline(false);
});
