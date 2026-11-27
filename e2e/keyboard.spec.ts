import { expect, test } from '@playwright/test';
import { makePdf } from './make-pdf';

const pdf = (name: string, pages = 1) => ({
  name,
  mimeType: 'application/pdf',
  buffer: makePdf(pages, name),
});

test.beforeEach(({ isMobile }) => {
  test.skip(isMobile, 'keyboard only');
});

test('focus never falls off the page when files are removed and brought back', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./#/tools/merge');
  await page.getByTestId('file-input').setInputFiles([pdf('a.pdf'), pdf('b.pdf'), pdf('c.pdf')]);
  await expect(page.getByTestId('file-row')).toHaveCount(3);
  await expect(page.getByRole('status').filter({ hasText: 'added' })).toHaveText(
    '3 PDFs added. 3 PDFs in the list.',
  );

  // Removing a slip hands focus to the one that takes its place.
  await page.getByRole('button', { name: 'Remove b.pdf' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Remove c.pdf' })).toBeFocused();

  // The last slip goes to the one above.
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Remove a.pdf' })).toBeFocused();

  // Undo puts focus back on the file that came back.
  await page.getByRole('button', { name: 'Undo' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Remove c.pdf' })).toBeFocused();

  // Remove all leaves only the drop sheet, which takes focus.
  await page.getByRole('button', { name: 'Remove all' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('drop-sheet')).toBeFocused();

  // And Undo from the empty sheet lands back on the list.
  await page.getByRole('button', { name: 'Undo' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Remove a.pdf' })).toBeFocused();
});

test('removing the only file moves focus to the drop sheet', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./#/tools/compress-pdf');
  await page.getByTestId('file-input').setInputFiles([pdf('only.pdf', 2)]);
  await page.getByRole('button', { name: 'Remove only.pdf' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('drop-sheet')).toBeFocused();
});

test('sheets close with Escape and give focus back', async ({ page }) => {
  await page.goto('./');
  const search = page.getByRole('button', { name: 'Search tools' });
  await search.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: /search tools and actions/i })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(search).toBeFocused();

  await page.keyboard.press('?');
  const sheet = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(sheet).toBeVisible();
  // The long list can be reached (after Close) and scrolled from the keyboard.
  await page.keyboard.press('Tab');
  await expect(sheet.getByRole('button', { name: 'Close' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(sheet.getByRole('region', { name: 'Shortcut list' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(search).toBeFocused();
});

test('split modes and pages work from the keyboard', async ({ page }) => {
  await page.goto('./#/tools/split');
  await page.getByTestId('file-input').setInputFiles([pdf('book.pdf', 4)]);
  await expect(page.getByTestId('page-tile')).toHaveCount(4, { timeout: 15_000 });

  const extract = page.getByRole('radio', { name: /Extract pages/ });
  await extract.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: /Split into parts/ })).toBeChecked();
  await expect(page.getByRole('radio', { name: /Split into parts/ })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: /Split every page/ })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Split into 4 PDFs' })).toBeEnabled();

  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(extract).toBeChecked();
  const tile = page.getByRole('button', { name: 'Page 2', exact: true });
  await tile.focus();
  await page.keyboard.press('Space');
  await expect(tile).toHaveAttribute('aria-pressed', 'true');
});
