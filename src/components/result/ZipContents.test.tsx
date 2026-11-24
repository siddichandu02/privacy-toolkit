import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JSZip from 'jszip';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openZip } from './zip-files';
import { ZipContents } from './ZipContents';

async function makeZip(files: Record<string, string>) {
  const zip = new JSZip();
  for (const [name, text] of Object.entries(files)) zip.file(name, text);
  return new Blob([(await zip.generateAsync({ type: 'uint8array' })) as BlobPart], {
    type: 'application/zip',
  });
}

let saved: { name: string; url: string }[] = [];

beforeEach(() => {
  saved = [];
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:${saved.length}`);
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    saved.push({ name: this.download, url: this.href });
  });
});

afterEach(() => vi.restoreAllMocks());

describe('openZip', () => {
  it('lists the files in order with their types', async () => {
    const files = await openZip(await makeZip({ 'a.jpg': 'one', 'b.png': 'two' }));
    expect(files.map((f) => f.name)).toEqual(['a.jpg', 'b.png']);
    const blob = await files[1]?.save();
    expect(blob?.type).toBe('image/png');
    expect(blob?.size).toBe(3);
  });
});

describe('ZipContents', () => {
  it('saves one file from the ZIP, opening it only once', async () => {
    const user = userEvent.setup();
    const blob = await makeZip({ 'a.jpg': 'one', 'a (2).jpg': 'two' });
    const open = vi.fn(openZip);
    render(
      <ZipContents
        blob={blob}
        accent="sky"
        open={open}
        items={[{ name: 'a.jpg', detail: '3 B' }, { name: 'a.jpg' }]}
      />,
    );
    expect(
      screen.getByText('2 files in the ZIP. Need just one? Save it on its own.'),
    ).toBeVisible();
    expect(open).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Save a (2).jpg' }));
    await waitFor(() => expect(saved).toEqual([{ name: 'a (2).jpg', url: 'blob:0' }]));
    expect(screen.getByRole('button', { name: 'Save a (2).jpg' })).toHaveAttribute(
      'data-state',
      'saved',
    );
    await user.click(screen.getByRole('button', { name: 'Save a.jpg' }));
    await waitFor(() => expect(saved).toHaveLength(2));
    expect(open).toHaveBeenCalledOnce();
  });

  it('points to the ZIP when a file cannot be taken out', async () => {
    const user = userEvent.setup();
    const open = vi.fn(async () => {
      throw new Error('bad zip');
    });
    render(
      <ZipContents blob={new Blob(['x'])} accent="sky" open={open} items={[{ name: 'a.jpg' }]} />,
    );
    await user.click(screen.getByRole('button', { name: 'Save a.jpg' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/download it instead/);
    expect(saved).toEqual([]);
  });
});
