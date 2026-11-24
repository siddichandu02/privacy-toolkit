import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import JSZip from 'jszip';

/** A photo drawn in the page: left half red, right half blue, saved as JPEG or PNG. */
async function photo(page: Page, width: number, height: number, type = 'image/jpeg') {
  const base64 = await page.evaluate(
    ([w, h, t]) => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no canvas');
      ctx.fillStyle = '#e63946';
      ctx.fillRect(0, 0, w / 2, h);
      ctx.fillStyle = '#1d3557';
      ctx.fillRect(w / 2, 0, w / 2, h);
      return canvas.toDataURL(t, 0.95).split(',')[1] ?? '';
    },
    [width, height, type] as const,
  );
  return Buffer.from(base64, 'base64');
}

/** Size and colour at a point of the downloaded photo, read from its link. */
async function readResult(page: Page, at: [number, number]) {
  const href = await page.getByRole('link', { name: 'Download photo' }).getAttribute('href');
  return page.evaluate(
    async ([url, x, y]) => {
      const blob = await fetch(url as string).then((r) => r.blob());
      const bitmap = await createImageBitmap(blob);
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no canvas');
      ctx.drawImage(bitmap, 0, 0);
      const [r, , b] = ctx.getImageData(x as number, y as number, 1, 1).data;
      return {
        width: bitmap.width,
        height: bitmap.height,
        type: blob.type,
        red: (r ?? 0) > (b ?? 0),
      };
    },
    [href, ...at] as const,
  );
}

test('cuts a photo to passport size on the device', async ({ page, baseURL }) => {
  const origin = new URL(baseURL ?? '').origin;
  const outside: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    if (/^(blob|data):/.test(url)) return;
    if (new URL(url).origin !== origin) outside.push(url);
  });

  await page.goto('./#/tools/resize');
  await expect(page.getByText('Being built right now')).toHaveCount(0);
  await page.getByTestId('file-input').setInputFiles({
    name: 'portrait.jpg',
    mimeType: 'image/jpeg',
    buffer: await photo(page, 1200, 900),
  });
  await expect(page.getByTestId('resize-summary')).toContainText('1200 × 900');

  // Push the frame all the way left, so only the red half is kept.
  const frame = page.getByTestId('crop-frame');
  await frame.focus();
  for (let i = 0; i < 12; i += 1) await page.keyboard.press('Shift+ArrowLeft');

  await page.getByRole('button', { name: 'Cut to 413 × 531' }).click();
  await expect(page.getByRole('heading', { name: 'Your photo is 413 × 531' })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText('portrait-413x531.jpg', { exact: true })).toBeVisible();
  const result = await readResult(page, [330, 260]);
  expect(result).toEqual({ width: 413, height: 531, type: 'image/jpeg', red: true });
  expect(outside).toEqual([]);
});

test('resizes the whole photo to a custom width and keeps PNG', async ({ page }) => {
  await page.goto('./#/tools/resize');
  await page.getByTestId('file-input').setInputFiles({
    name: 'chart.png',
    mimeType: 'image/png',
    buffer: await photo(page, 800, 400, 'image/png'),
  });
  await expect(page.getByTestId('resize-summary')).toContainText('800 × 400');
  await page.getByText('Custom', { exact: true }).click();
  await page.getByRole('textbox', { name: 'Width' }).fill('300');
  await expect(page.getByRole('textbox', { name: 'Height' })).toHaveValue('150');
  await page.getByRole('button', { name: 'Resize to 300 × 150' }).click();
  await expect(page.getByRole('heading', { name: 'Your photo is 300 × 150' })).toBeVisible({
    timeout: 20_000,
  });
  // Nothing cut off: the right edge is still blue.
  const result = await readResult(page, [295, 75]);
  expect(result).toEqual({ width: 300, height: 150, type: 'image/png', red: false });
});

test('drags the photo inside the frame', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'needs a mouse');
  await page.goto('./#/tools/resize');
  await page.getByTestId('file-input').setInputFiles({
    name: 'wide.jpg',
    mimeType: 'image/jpeg',
    buffer: await photo(page, 1600, 800),
  });
  await page.getByText('Instagram post').click();
  const cropper = page.getByTestId('cropper');
  const before = await cropper.getAttribute('data-box');
  await cropper.scrollIntoViewIfNeeded();
  const box = await page.getByTestId('crop-frame').boundingBox();
  if (!box) throw new Error('no frame');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2, { steps: 6 });
  await page.mouse.up();
  const after = await cropper.getAttribute('data-box');
  expect(before).toBe('0.250,0.000,0.500,1.000');
  // Dragging the photo right shows more of its left side.
  expect(Number(after?.split(',')[0])).toBeLessThan(0.25);
});

test('cuts a batch to one size, each with its own framing, into a ZIP', async ({ page }) => {
  await page.goto('./#/tools/resize');
  await page.getByTestId('file-input').setInputFiles([
    { name: 'left.jpg', mimeType: 'image/jpeg', buffer: await photo(page, 1200, 900) },
    { name: 'right.jpg', mimeType: 'image/jpeg', buffer: await photo(page, 1200, 900) },
    { name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not a picture') },
  ]);
  await expect(page.getByTestId('resize-thumb')).toHaveCount(3);
  await page.getByText('Profile photo').click();
  await expect(page.getByTestId('cropper')).toHaveAttribute('data-ready', 'true');

  // Frame the first photo on its red half and the second on its blue half.
  const frame = page.getByTestId('crop-frame');
  await frame.focus();
  for (let i = 0; i < 12; i += 1) await page.keyboard.press('Shift+ArrowLeft');
  await page.getByTestId('resize-thumb').nth(1).click();
  // Wait for the second photo to open before moving its frame.
  await expect(page.getByTestId('resize-thumb').nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('cropper')).toHaveAttribute('data-ready', 'true');
  await frame.focus();
  for (let i = 0; i < 12; i += 1) await page.keyboard.press('Shift+ArrowRight');
  await expect(page.getByTestId('resize-thumb').nth(0)).toHaveAttribute('data-moved', 'true');
  await expect(page.getByTestId('resize-thumb').nth(1)).toHaveAttribute('data-moved', 'true');

  await page.getByRole('button', { name: 'Cut 3 photos to 400 × 400' }).click();
  await expect(page.getByRole('heading', { name: '2 photos are now 400 × 400' })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText(/Left out broken\.png/)).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Download ZIP' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('resized-photos.zip');
  const zip = await JSZip.loadAsync(await readFile(await download.path()));
  expect(Object.keys(zip.files)).toEqual(['left-400x400.jpg', 'right-400x400.jpg']);
  const colours = await Promise.all(
    ['left-400x400.jpg', 'right-400x400.jpg'].map(async (name) => {
      const base64 = (await zip.file(name)?.async('base64')) ?? '';
      return page.evaluate(async (b64) => {
        const blob = await fetch(`data:image/jpeg;base64,${b64}`).then((r) => r.blob());
        const bitmap = await createImageBitmap(blob);
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('no canvas');
        ctx.drawImage(bitmap, 0, 0);
        const [r, , b] = ctx.getImageData(200, 200, 1, 1).data;
        return { size: `${bitmap.width}x${bitmap.height}`, red: (r ?? 0) > (b ?? 0) };
      }, base64);
    }),
  );
  expect(colours).toEqual([
    { size: '400x400', red: true },
    { size: '400x400', red: false },
  ]);

  // Just one of them, taken out of the ZIP on the page.
  const [single] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Save right-400x400.jpg' }).click(),
  ]);
  expect(single.suggestedFilename()).toBe('right-400x400.jpg');
  const bytes = await readFile(await single.path());
  expect(
    bytes.equals(Buffer.from((await zip.file('right-400x400.jpg')?.async('uint8array')) ?? [])),
  ).toBe(true);
  await expect(page.getByRole('button', { name: 'Save right-400x400.jpg' })).toHaveAttribute(
    'data-state',
    'saved',
  );
});
