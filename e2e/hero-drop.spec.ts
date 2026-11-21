import { expect, test } from '@playwright/test';
import { makePdf } from './make-pdf';

const pdf = (name: string, pages = 1) => ({
  name,
  mimeType: 'application/pdf',
  buffer: makePdf(pages, name),
});

test('a file dropped on the home page opens in the picked tool', async ({ page }) => {
  await page.goto('./');
  const zone = page.getByTestId('hero-drop');
  // Drag two real PDFs over the zone, then drop them.
  const data = await page.evaluateHandle(
    async (files) => {
      const dt = new DataTransfer();
      for (const f of files) {
        const bytes = Uint8Array.from(atob(f.b64), (c) => c.charCodeAt(0));
        dt.items.add(new File([bytes], f.name, { type: 'application/pdf' }));
      }
      return dt;
    },
    [pdf('one.pdf'), pdf('two.pdf', 2)].map((f) => ({
      name: f.name,
      b64: Buffer.from(f.buffer).toString('base64'),
    })),
  );
  await zone.dispatchEvent('dragenter', { dataTransfer: data });
  await expect(zone).toHaveAttribute('data-dragging', 'true');
  await zone.dispatchEvent('drop', { dataTransfer: data });

  const group = page.getByRole('group', { name: 'What should we do with it?' });
  await expect(group.getByText(/2 PDFs/)).toBeVisible();
  await group.getByRole('button', { name: /Merge PDF/ }).click();

  await expect(page).toHaveURL(/#\/tools\/merge$/);
  await expect(page.getByTestId('file-row')).toHaveCount(2);
});

test('single-file tools take just the first file', async ({ page }) => {
  await page.goto('./');
  await page.getByTestId('hero-file-input').setInputFiles([pdf('a.pdf'), pdf('b.pdf')]);
  await page.getByRole('button', { name: /Split PDF/ }).click();
  await expect(page.getByTestId('file-row')).toHaveCount(1);
  await expect(page.getByText('a.pdf')).toBeVisible();
});

test('the tool cards start above the fold on a laptop screen', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'desktop layout only');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('./');
  const card = page.getByRole('link', { name: 'Merge PDF' });
  const box = await card.boundingBox();
  expect(box?.y ?? 9999).toBeLessThan(800 - 120);
});
