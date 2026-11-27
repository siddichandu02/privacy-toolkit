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
      await page.addInitScript((t) => localStorage.setItem('pt-theme', t), theme);
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
  });
}
