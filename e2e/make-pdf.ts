/**
 * Build a tiny valid PDF with `pages` blank pages and a line of text on each,
 * so tests do not need binary fixtures.
 */
export function makePdf(pages = 1, label = 'Test', { locked = false } = {}): Buffer {
  const objects: string[] = [];
  const kids = Array.from({ length: pages }, (_, i) => `${4 + i * 2} 0 R`).join(' ');
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push(`<< /Type /Pages /Kids [${kids}] /Count ${pages} >>`);
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  for (let i = 0; i < pages; i++) {
    const stream = `BT /F1 36 Tf 72 700 Td (${label} ${i + 1}) Tj ET`;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`,
    );
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  }
  // A locked file: an /Encrypt entry whose password check never passes, so
  // readers ask for a password.
  const hex = (c: string, n: number) => `<${c.repeat(n * 2)}>`;
  if (locked) {
    objects.push(`<< /Filter /Standard /V 1 /R 2 /O ${hex('a', 32)} /U ${hex('b', 32)} /P -4 >>`);
  }
  const lock = locked
    ? ` /Encrypt ${objects.length} 0 R /ID [${hex('c', 16)} ${hex('c', 16)}]`
    : '';

  let body = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(body.length);
    body += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) body += `${String(off).padStart(10, '0')} 00000 n \n`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R${lock} >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body, 'latin1');
}
