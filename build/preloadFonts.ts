import type { Plugin } from 'vite';

/** The two faces the first screen is set in. Other subsets load only if a page needs them. */
const FIRST_SCREEN = [
  /^assets\/bricolage-grotesque-latin-wght-/,
  /^assets\/plus-jakarta-sans-latin-wght-/,
];

/** Preload tags for the built font files that match, in the order of the patterns. */
export function fontPreloads(
  files: readonly string[],
  base: string,
  patterns: readonly RegExp[] = FIRST_SCREEN,
): string[] {
  return patterns.flatMap((re) => {
    const file = files.find((f) => re.test(f) && f.endsWith('.woff2'));
    return file
      ? [`<link rel="preload" href="${base}${file}" as="font" type="font/woff2" crossorigin>`]
      : [];
  });
}

/**
 * Starts the display and body fonts downloading with the HTML. Without this the
 * browser finds them only after the CSS, lays the page out in the fallback
 * font, then lays it all out again once they arrive.
 */
export function preloadFonts(): Plugin {
  let base = '/';
  return {
    name: 'preload-fonts',
    apply: 'build',
    configResolved(config) {
      base = config.base;
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html;
        const tags = fontPreloads(Object.keys(ctx.bundle), base);
        return html.replace('</title>', `</title>\n    ${tags.join('\n    ')}`);
      },
    },
  };
}
