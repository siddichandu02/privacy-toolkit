export type ZipFiles = { name: string; save: () => Promise<Blob> }[];

const TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
};

const typeOf = (name: string) => TYPES[name.split('.').pop()?.toLowerCase() ?? ''] ?? '';

/** Opens a ZIP made on this page and lists its files in order. JSZip loads only when asked. */
export async function openZip(blob: Blob): Promise<ZipFiles> {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  return Object.values(zip.files)
    .filter((f) => !f.dir)
    .map((f) => ({
      name: f.name,
      save: async () =>
        new Blob([(await f.async('uint8array')) as BlobPart], { type: typeOf(f.name) }),
    }));
}
