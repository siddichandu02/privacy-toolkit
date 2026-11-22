import { expect, test } from '@playwright/test';
import { makePdf } from './make-pdf';

const locked = {
  name: 'lease.pdf',
  mimeType: 'application/pdf',
  buffer: makePdf(2, 'Lease', { locked: true }),
};

for (const id of ['rotate', 'split', 'sign']) {
  test(`${id} explains how to unlock a password-protected PDF`, async ({ page }) => {
    await page.goto(`./#/tools/${id}`);
    await page.getByTestId('file-input').setInputFiles([locked]);
    const alert = page.getByRole('alert', { name: 'This PDF has a password' });
    await expect(alert).toBeVisible({ timeout: 15_000 });
    await expect(alert).toContainText('lease.pdf is locked');
    await expect(alert.getByRole('listitem')).toHaveCount(3);
  });
}

test('merge names the locked file when it stops', async ({ page }) => {
  await page.goto('./#/tools/merge');
  await page
    .getByTestId('file-input')
    .setInputFiles([locked, { name: 'fine.pdf', mimeType: 'application/pdf', buffer: makePdf(1) }]);
  await page.getByRole('button', { name: 'Merge 2 PDFs' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'lease.pdf is password protected. Unlock it first',
    { timeout: 20_000 },
  );
});
