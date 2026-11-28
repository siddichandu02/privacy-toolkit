import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { makePdf } from './make-pdf';

const TOOLS = [
  'merge',
  'split',
  'rotate',
  'images-to-pdf',
  'sign',
  'compress-pdf',
  'compress-image',
  'convert',
  'resize',
  'exif',
];
const PDF_TOOLS = new Set(['merge', 'split', 'rotate', 'sign', 'compress-pdf']);

const pdf = (name: string, pages = 1) => ({
  name,
  mimeType: 'application/pdf',
  buffer: makePdf(pages, name),
});

/** WCAG 2.1 A and AA rules only; the 3D canvas and decorative layers are left out. */
async function scan(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('canvas')
    // This rule wants every word inside a control in its name, including
    // descriptions (a tool card's blurb). WCAG 2.5.3 only asks that the name
    // contain the visible label, which ours start with.
    .disableRules(['label-content-name-mismatch'])
    .analyze();
  return result.violations.map((v) => ({
    id: v.id,
    nodes: v.nodes.map((n) => n.target.join(' ')).slice(0, 5),
  }));
}

async function photo(page: Page) {
  const base64 = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 120;
    c.height = 80;
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('no canvas');
    ctx.fillStyle = '#4cc9f0';
    ctx.fillRect(0, 0, 120, 80);
    return c.toDataURL('image/png').split(',')[1] ?? '';
  });
  return { name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') };
}

for (const theme of ['dark', 'light'] as const) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.addInitScript((t) => localStorage.setItem('pdfpip:theme', t), theme);
    });

    test('home has no WCAG AA problems', async ({ page }) => {
      await page.goto('./');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await scan(page)).toEqual([]);
    });

    for (const id of TOOLS) {
      test(`${id} with a file added has no WCAG AA problems`, async ({ page }) => {
        await page.goto(`./#/tools/${id}`);
        const input = page.getByTestId('file-input');
        await input.waitFor({ state: 'attached' });
        expect(await scan(page)).toEqual([]);
        if (PDF_TOOLS.has(id))
          await input.setInputFiles([
            { name: 'a.pdf', mimeType: 'application/pdf', buffer: makePdf(3, 'a') },
          ]);
        else await input.setInputFiles([await photo(page)]);
        await expect(page.getByTestId('file-row')).toHaveCount(1);
        await page.waitForTimeout(800);
        expect(await scan(page)).toEqual([]);
      });
    }

    test('done cards have no WCAG AA problems', async ({ page }) => {
      await page.goto('./#/tools/merge');
      await page.getByTestId('file-input').setInputFiles([pdf('a.pdf', 2), pdf('b.pdf', 1)]);
      await page.getByRole('button', { name: 'Merge 2 PDFs' }).click();
      await expect(page.getByRole('heading', { name: 'Your PDF is ready' })).toBeVisible({
        timeout: 15_000,
      });
      await page.waitForTimeout(600);
      expect(await scan(page)).toEqual([]);

      await page.goto('./#/tools/convert');
      await page.getByTestId('file-input').setInputFiles([await photo(page)]);
      await page.getByRole('button', { name: /^Convert to/ }).click();
      await expect(page.getByRole('heading', { name: /Your photo is now/ })).toBeVisible({
        timeout: 15_000,
      });
      await page.waitForTimeout(600);
      expect(await scan(page)).toEqual([]);
    });

    test('the error card has no WCAG AA problems', async ({ page }) => {
      await page.goto('./#/tools/merge');
      await page.route(/\/merge\.worker-[\w-]+\.js/, (route) =>
        route.fulfill({ status: 404, body: 'Not found' }),
      );
      await page.getByTestId('file-input').setInputFiles([pdf('a.pdf'), pdf('b.pdf')]);
      await page.getByRole('button', { name: 'Merge 2 PDFs' }).click();
      await expect(page.getByRole('alert')).toBeVisible({ timeout: 15_000 });
      await page.waitForTimeout(600);
      expect(await scan(page)).toEqual([]);
    });

    test('the search palette and shortcuts sheet have no WCAG AA problems', async ({ page }) => {
      await page.goto('./');
      await page.getByRole('button', { name: 'Search tools' }).click();
      const palette = page.getByRole('dialog', { name: /search tools and actions/i });
      await palette.getByRole('combobox').fill('pdf');
      await expect(palette.getByRole('option').first()).toBeVisible();
      await page.waitForTimeout(400);
      expect(await scan(page)).toEqual([]);
      await page.keyboard.press('Escape');
      await expect(palette).toHaveCount(0);

      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await page.keyboard.press('?');
      await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
      await page.waitForTimeout(400);
      expect(await scan(page)).toEqual([]);
    });

    test('home suggestions after a drop have no WCAG AA problems', async ({ page }) => {
      await page.goto('./');
      await page.getByTestId('hero-file-input').setInputFiles([pdf('a.pdf'), pdf('b.pdf')]);
      await expect(page.getByRole('group', { name: 'What should we do with it?' })).toBeVisible();
      await page.waitForTimeout(400);
      expect(await scan(page)).toEqual([]);
    });

    test('the lost page has no WCAG AA problems', async ({ page }) => {
      await page.goto('./#/tools/spilt');
      const unfold = page.getByRole('button', { name: 'Unfold the crumpled page' });
      await expect(unfold).toBeVisible();
      expect(await scan(page)).toEqual([]);
      await unfold.click();
      await expect(page.getByText('Found the way back.')).toBeVisible();
      await page.waitForTimeout(400);
      expect(await scan(page)).toEqual([]);
    });
  });
}

test('progress and the playing step stay visible in high contrast', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await page.goto('./');
  await expect(page.getByTestId('hero-story')).toBeVisible();
  const highlight = await page.evaluate(() => {
    const probe = document.createElement('span');
    probe.style.backgroundColor = 'Highlight';
    document.body.append(probe);
    const color = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return color;
  });
  const fills = await page
    .locator('.fc-fill')
    .evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor));
  expect(fills.length).toBeGreaterThan(0);
  for (const fill of fills) expect(fill).toBe(highlight);
});
