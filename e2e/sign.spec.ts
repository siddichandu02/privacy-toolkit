import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRawStream, type PDFObject } from 'pdf-lib';
import { makePdf } from './make-pdf';

const pdf = (name: string, pages: number) => ({
  name,
  mimeType: 'application/pdf',
  buffer: makePdf(pages, name),
});

/** Pages of a saved PDF that carry an image, i.e. the signature. */
async function signedPages(path: string) {
  const doc = await PDFDocument.load(await readFile(path));
  return doc.getPages().map((p) => {
    const xobjects = p.node.Resources()?.lookupMaybe(PDFName.of('XObject'), PDFDict);
    return (xobjects?.keys().length ?? 0) > 0;
  });
}

/** Every content stream of a page as text, inflated when needed. */
function pageText(doc: PDFDocument, index: number) {
  const contents = doc.getPage(index).node.Contents();
  const parts: PDFObject[] =
    contents instanceof PDFArray ? contents.asArray() : contents ? [contents] : [];
  return parts
    .map((ref) => {
      const stream = doc.context.lookup(ref);
      if (!(stream instanceof PDFRawStream)) return '';
      const raw = Buffer.from(stream.contents);
      const flate = String(stream.dict.get(PDFName.of('Filter')) ?? '').includes('Flate');
      return (flate ? inflateSync(raw) : raw).toString('latin1');
    })
    .join('\n');
}

/**
 * Where the signature image was drawn on an unrotated page, in points.
 * pdf-lib writes a translate to its bottom left corner, then a scale to its size.
 */
function drawnBox(text: string) {
  const block = text.slice(text.lastIndexOf('q', text.lastIndexOf(' Do')));
  const number = '(-?[\\d.]+)';
  const cm = new RegExp(`${Array(6).fill(number).join(' ')} cm`, 'g');
  const cms = [...block.matchAll(cm)].map((m) => m.slice(1, 7).map(Number));
  const move = cms.find((c) => c[0] === 1 && c[3] === 1 && (c[4] !== 0 || c[5] !== 0));
  const size = cms.findLast((c) => c[1] === 0 && c[2] === 0 && !(c[0] === 1 && c[3] === 1));
  if (!move || !size) throw new Error(`no image placement in: ${block}`);
  return { x: move[4] ?? 0, y: move[5] ?? 0, width: size[0] ?? 0, height: size[3] ?? 0 };
}

async function scribble(page: Page) {
  const pad = page.getByTestId('signature-canvas');
  await pad.scrollIntoViewIfNeeded();
  const box = await pad.boundingBox();
  if (!box) throw new Error('no signature pad');
  const y = box.y + box.height * 0.55;
  await page.mouse.move(box.x + 40, y);
  await page.mouse.down();
  for (let i = 1; i <= 20; i++) {
    await page.mouse.move(box.x + 40 + i * 9, y - Math.sin(i / 2) * 18, { steps: 2 });
  }
  await page.mouse.up();
}

test('draws a signature and places it on a page', async ({ page, baseURL }) => {
  const origin = new URL(baseURL ?? '').origin;
  const outside: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    if (/^(blob|data):/.test(url)) return;
    if (new URL(url).origin !== origin) outside.push(url);
  });

  await page.goto('./#/tools/sign');
  await expect(page.getByText('Being built right now')).toHaveCount(0);
  await page.getByTestId('file-input').setInputFiles([pdf('lease.pdf', 2)]);
  await expect(page.getByText('Page 1 of 2')).toBeVisible({ timeout: 15_000 });
  const sign = page.getByRole('button', { name: 'Sign PDF' });
  await expect(sign).toBeDisabled();

  await scribble(page);
  const placed = page.getByTestId('signature-box');
  await expect(placed).toBeVisible();
  await expect(sign).toBeEnabled();

  // Drag it towards the top left.
  await page.getByTestId('sign-sheet').scrollIntoViewIfNeeded();
  const before = Number(await placed.getAttribute('data-x'));
  const b = await placed.boundingBox();
  if (!b) throw new Error('no signature box');
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x - 60, b.y - 80, { steps: 6 });
  await page.mouse.up();
  await expect
    .poll(async () => Number(await placed.getAttribute('data-x')))
    .toBeLessThan(before - 0.1);

  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.getByText('Signs page 2. lease.pdf stays as it is.')).toBeVisible();
  await sign.click();

  await expect(page.getByRole('heading', { name: 'Your signed PDF is ready' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText('Signed on page 2 of 2', { exact: false })).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Download PDF' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('lease-signed.pdf');
  expect(await signedPages(await download.path())).toEqual([false, true]);

  // Back to the page with the signature still there.
  await page.getByRole('button', { name: 'Move the signature' }).click();
  await expect(page.getByTestId('signature-box')).toBeVisible();
  expect(outside).toEqual([]);
});

test('zooms in to place the signature exactly, and the saved PDF matches', async ({
  page,
  isMobile,
}) => {
  await page.goto('./#/tools/sign');
  await page.getByTestId('file-input').setInputFiles([pdf('form.pdf', 1)]);
  await scribble(page);
  const placed = page.getByTestId('signature-box');
  await expect(placed).toBeVisible();

  const view = page.getByTestId('sign-view');
  const zoomOf = async () => Number(await view.getAttribute('data-zoom'));
  await view.scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Fit page' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(await zoomOf()).toBeLessThan(1);

  // Zoom to 200% with the buttons; the page is drawn again at that size.
  await page.getByRole('button', { name: /Show at actual size/ }).click();
  await expect(page.getByTestId('zoom-level')).toHaveText('100%');
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect(page.getByTestId('zoom-level')).toHaveText('200%');
  await expect.poll(zoomOf).toBeCloseTo(2, 3);
  const sheet = page.getByTestId('sign-sheet');
  const shownWidth = (await sheet.boundingBox())?.width ?? 0;
  expect(Math.abs(shownWidth - 612 * (96 / 72) * 2)).toBeLessThan(1);
  const pageImage = page.getByTestId('sign-page-image');
  await expect
    .poll(() => pageImage.evaluate((img: HTMLImageElement) => img.naturalWidth), {
      timeout: 15_000,
    })
    .toBeGreaterThanOrEqual(Math.floor(shownWidth));

  // Bring the signature into view and drag it a little: the magnifier
  // shows up while dragging.
  await placed.scrollIntoViewIfNeeded();
  const b = await placed.boundingBox();
  if (!b) throw new Error('no signature box');
  const startX = Number(await placed.getAttribute('data-x'));
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 - 40, b.y + b.height / 2, { steps: 5 });
  await expect(page.getByTestId('signature-loupe')).toBeVisible();
  await page.mouse.up();
  await expect(page.getByTestId('signature-loupe')).toHaveCount(0);
  const dragged = Number(await placed.getAttribute('data-x'));
  // 40 screen pixels at 200% is a small, exact move on the page.
  expect(startX - dragged).toBeCloseTo(40 / shownWidth, 3);

  // Arrow keys nudge one screen pixel, Shift ten.
  await placed.focus();
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('ArrowDown');
  await expect
    .poll(async () => Number(await placed.getAttribute('data-x')))
    .toBeCloseTo(dragged + 10 / shownWidth, 3);

  if (!isMobile) {
    // Ctrl + wheel zooms too.
    const before = await zoomOf();
    const v = await view.boundingBox();
    if (!v) throw new Error('no view');
    await page.mouse.move(v.x + v.width / 2, v.y + v.height / 2);
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, 200);
    await page.keyboard.up('Control');
    await expect.poll(zoomOf).toBeLessThan(before);
  }

  const place = {
    x: Number(await placed.getAttribute('data-x')),
    y: Number(await placed.getAttribute('data-y')),
    w: Number(await placed.getAttribute('data-w')),
  };
  await page.getByRole('button', { name: 'Sign PDF' }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Download PDF' }).click(),
  ]);
  const doc = await PDFDocument.load(await readFile(await download.path()));
  const box = drawnBox(pageText(doc, 0));
  // What was on screen is what got saved, to within a quarter of a point.
  expect(Math.abs(box.x - place.x * 612)).toBeLessThan(0.25);
  expect(Math.abs(box.width - place.w * 612)).toBeLessThan(0.25);
  expect(Math.abs(792 - (box.y + box.height) - place.y * 792)).toBeLessThan(0.25);
});

test('types a name and signs every page', async ({ page }) => {
  await page.goto('./#/tools/sign');
  await page.getByTestId('file-input').setInputFiles([pdf('form.pdf', 3)]);
  await expect(page.getByText('Page 1 of 3')).toBeVisible({ timeout: 15_000 });
  await page.getByText('Type', { exact: true }).click();
  await page.getByLabel('Your name').fill('Alex Morgan');
  await expect(page.getByTestId('signature-box')).toBeVisible();
  await page.getByText('Every page', { exact: true }).click();
  await page.getByRole('button', { name: 'Sign PDF' }).click();

  await expect(page.getByText('Signed on all 3 pages', { exact: false })).toBeVisible({
    timeout: 15_000,
  });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Download PDF' }).click(),
  ]);
  expect(await signedPages(await download.path())).toEqual([true, true, true]);
});

test('a long typed name shrinks to fit the slip', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('./#/tools/sign');
  await page.getByTestId('file-input').setInputFiles([pdf('form.pdf', 2)]);
  await expect(page.getByText('Page 1 of 2')).toBeVisible({ timeout: 15_000 });
  await page.getByText('Type', { exact: true }).click();
  await page.getByLabel('Your name').fill('Alexandra Montgomery-Smith');

  const preview = page.getByTestId('typed-preview');
  await expect.poll(async () => Number(await preview.getAttribute('data-scale'))).toBeLessThan(1);
  await expect
    .poll(() =>
      preview.evaluate((box) => {
        const line = box.firstElementChild?.getBoundingClientRect();
        return !!line && line.right <= box.getBoundingClientRect().right + 1;
      }),
    )
    .toBe(true);
});
