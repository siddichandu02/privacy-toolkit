import { expect, test, type Locator, type Page } from '@playwright/test';
import { makePdf } from './make-pdf';

const pdf = (name: string, pages = 1) => ({
  name,
  mimeType: 'application/pdf',
  buffer: makePdf(pages, name),
});

async function boxOf(target: Locator) {
  const box = await target.boundingBox();
  if (!box) throw new Error('not on screen');
  return box;
}

/** A real one-finger swipe, sent as touch input so the page sees touch pointers. */
async function swipe(page: Page, from: { x: number; y: number }, by: { x: number; y: number }) {
  const cdp = await page.context().newCDPSession(page);
  const point = (t: number) => [
    { x: from.x + by.x * t, y: from.y + by.y * t, id: 1, radiusX: 4, radiusY: 4 },
  ];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(0) });
  for (let i = 1; i <= 12; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(i / 12) });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

test.describe('on a phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'touch and phone layout only');

  test('a file slip swipes away to the left and Undo brings it back', async ({ page }) => {
    await page.goto('./#/tools/merge');
    await page.getByTestId('file-input').setInputFiles([pdf('keep.pdf'), pdf('swipe-me.pdf')]);
    await expect(page.getByTestId('file-row')).toHaveCount(2);

    const row = page.getByTestId('file-row').filter({ hasText: 'swipe-me.pdf' });
    await row.scrollIntoViewIfNeeded();
    const box = await boxOf(row);
    // A short drag springs back.
    await swipe(page, { x: box.x + box.width * 0.6, y: box.y + box.height / 2 }, { x: -30, y: 0 });
    await page.waitForTimeout(400);
    await expect(page.getByTestId('file-row')).toHaveCount(2);

    await swipe(page, { x: box.x + box.width * 0.7, y: box.y + box.height / 2 }, { x: -220, y: 0 });
    await expect(page.getByTestId('file-row')).toHaveCount(1);
    await expect(page.getByTestId('file-row')).toContainText('keep.pdf');

    await page.getByTestId('undo-bar').getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByTestId('file-row')).toHaveCount(2);
  });

  test('the main button rides at the bottom while it is out of sight', async ({ page }) => {
    await page.goto('./#/tools/merge');
    await page
      .getByTestId('file-input')
      .setInputFiles(['one', 'two', 'three', 'four', 'five'].map((n) => pdf(`${n}.pdf`)));
    await expect(page.getByTestId('file-row')).toHaveCount(5);
    await page.evaluate(() => window.scrollTo(0, 0));
    const dock = page.getByTestId('action-dock');
    const copy = page.getByTestId('action-dock-button');
    await expect(copy).toHaveText('Merge 5 PDFs');
    const tile = await boxOf(copy);
    expect(tile.height).toBeGreaterThanOrEqual(44);

    await copy.click();
    await expect(page.getByRole('heading', { name: 'Your PDF is ready' })).toBeVisible({
      timeout: 30_000,
    });
    await expect(dock).toBeHidden();
  });

  test('sheets rise from the bottom and pull down to close', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.keyboard.press('?');
    const sheet = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
    await expect(sheet).toHaveAttribute('data-placement', 'bottom');
    await page.waitForTimeout(500);
    const box = await boxOf(sheet);
    const viewport = page.viewportSize() ?? { width: 0, height: 0 };
    expect(Math.round(box.y + box.height)).toBeGreaterThanOrEqual(viewport.height - 1);

    const grip = await boxOf(page.getByTestId('sheet-grip'));
    await swipe(
      page,
      { x: grip.x + grip.width / 2, y: grip.y + grip.height / 2 },
      { x: 0, y: 260 },
    );
    await expect(sheet).toBeHidden();
  });

  test('the search still opens at the top, clear of the keyboard', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('button', { name: 'Search tools' }).click();
    const palette = page.getByRole('dialog', { name: 'Search tools and actions' });
    await expect(palette).toHaveAttribute('data-placement', 'top');
  });
});

/** Controls on screen whose touch area is under 44 px either way (footer links aside). */
async function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out = new Set<string>();
    const controls = Array.from(
      document.querySelectorAll<HTMLElement>(
        'main button, header button, header a[href], main a[href], main [role=button]',
      ),
    );
    for (const el of controls) {
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0 || el.closest('.sr-only')) continue;
      // A `tap` control reaches past its edges with an invisible ::after.
      const after = getComputedStyle(el, '::after');
      const reach = after.content !== 'none' && after.position === 'absolute';
      const w = Math.max(box.width, reach ? parseFloat(after.width) || 0 : 0);
      const h = Math.max(box.height, reach ? parseFloat(after.height) || 0 : 0);
      if (w < 43.5 || h < 43.5) {
        const name = (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40);
        out.add(`${name} ${Math.round(w)}x${Math.round(h)}`);
      }
    }
    return Array.from(out);
  });
}

test.describe('tap targets on a phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'touch screens only');

  const png = {
    name: 'photo.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAKklEQVR4nO3BAQ0AAADCoPdPbQ8HFAAAAAAAAAAAAAAAAAAAAAAAAAAA8GMnAAHhLe1jAAAAAElFTkSuQmCC',
      'base64',
    ),
  };
  const tools: [string, 'pdf' | 'image', string][] = [
    ['merge', 'pdf', 'Merge PDFs'],
    ['split', 'pdf', 'Split'],
    ['rotate', 'pdf', 'Turn page 1 right'],
    ['sign', 'pdf', 'Next page'],
    ['images-to-pdf', 'image', 'Show the next page'],
    ['resize', 'image', 'Re-centre'],
    ['exif', 'image', 'Remove photo.png'],
  ];

  test('home controls are at least 44 px to touch', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await smallTargets(page)).toEqual([]);
  });

  for (const [id, kind, ready] of tools) {
    test(`${id} controls are at least 44 px to touch`, async ({ page }) => {
      await page.goto(`./#/tools/${id}`);
      await page
        .getByTestId('file-input')
        .first()
        .setInputFiles(kind === 'pdf' ? [pdf('three.pdf', 3)] : [png]);
      await expect(page.getByRole('button', { name: ready }).first()).toBeVisible({
        timeout: 15_000,
      });
      expect(await smallTargets(page)).toEqual([]);
    });
  }
});
