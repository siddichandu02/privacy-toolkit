import { describe, expect, it } from 'vitest';
import { fontPreloads } from './preloadFonts';

describe('fontPreloads', () => {
  const files = [
    'assets/index-abc.js',
    'assets/bricolage-grotesque-latin-ext-wght-normal-x1.woff2',
    'assets/bricolage-grotesque-latin-wght-normal-x2.woff2',
    'assets/plus-jakarta-sans-vietnamese-wght-normal-y1.woff2',
    'assets/plus-jakarta-sans-latin-wght-normal-y2.woff2',
    'assets/caveat-latin-wght-normal-z.woff2',
  ];

  it('preloads only the latin display and body faces', () => {
    expect(fontPreloads(files, '/pdfpip/')).toEqual([
      '<link rel="preload" href="/pdfpip/assets/bricolage-grotesque-latin-wght-normal-x2.woff2" as="font" type="font/woff2" crossorigin>',
      '<link rel="preload" href="/pdfpip/assets/plus-jakarta-sans-latin-wght-normal-y2.woff2" as="font" type="font/woff2" crossorigin>',
    ]);
  });

  it('skips a face that is not in the build', () => {
    expect(fontPreloads(['assets/index.js'], '/')).toEqual([]);
  });
});
