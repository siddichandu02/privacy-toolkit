import { PDFDocument, PDFName } from 'pdf-lib';

/**
 * A one-page PDF that says it is encrypted (it has an /Encrypt entry in its
 * trailer), which is what password-protected files look like to the tools.
 */
export async function makeLockedPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([300, 400]);
  const { context } = doc;
  const encrypt = context.obj({ Filter: 'Standard', V: 1, R: 2, P: -4 });
  encrypt.set(PDFName.of('O'), context.obj([]));
  context.trailerInfo.Encrypt = context.register(encrypt);
  return doc.save({ useObjectStreams: false });
}
