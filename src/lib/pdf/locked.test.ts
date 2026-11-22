import { describe, expect, it } from 'vitest';
import { makeLockedPdf } from '../../test/make-locked-pdf';
import { compressPdf } from './compress';
import { mergePdfs } from './merge';
import { rotatePdf } from './rotate';
import { signPdf } from './sign';
import { splitPdf } from './split';

const LOCKED = 'secret.pdf is password protected. Unlock it first, then try again.';

describe('password-protected PDFs', () => {
  it('the fixture really reads as encrypted', async () => {
    const { PDFDocument } = await import('pdf-lib');
    await expect(PDFDocument.load(await makeLockedPdf())).rejects.toThrow(/encrypt/i);
  });

  it('merge names the locked file', async () => {
    await expect(mergePdfs([{ name: 'secret.pdf', bytes: await makeLockedPdf() }])).rejects.toThrow(
      LOCKED,
    );
  });

  it('split says to unlock it first', async () => {
    await expect(
      splitPdf({
        name: 'secret.pdf',
        bytes: await makeLockedPdf(),
        ranges: [{ from: 1, to: 1 }],
        mode: 'extract',
      }),
    ).rejects.toThrow(LOCKED);
  });

  it('rotate says to unlock it first', async () => {
    await expect(
      rotatePdf({
        name: 'secret.pdf',
        bytes: await makeLockedPdf(),
        edits: [{ turns: 1, keep: true }],
      }),
    ).rejects.toThrow(LOCKED);
  });

  it('sign says to unlock it first', async () => {
    await expect(
      signPdf({
        name: 'secret.pdf',
        bytes: await makeLockedPdf(),
        signature: new Uint8Array(),
        aspect: 0.4,
        place: { x: 0.1, y: 0.1, w: 0.3 },
        pages: [0],
      }),
    ).rejects.toThrow(LOCKED);
  });

  it('compress says to unlock it first', async () => {
    await expect(
      compressPdf(
        { name: 'secret.pdf', bytes: await makeLockedPdf(), level: 'balanced' },
        async () => null,
      ),
    ).rejects.toThrow(LOCKED);
  });
});
