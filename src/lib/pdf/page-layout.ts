// Page maths for Images to PDF. No pdf-lib here, so the page UI can use it
// without pulling the PDF library into the main bundle.

export type PageSize = 'a4' | 'letter' | 'fit';
export type Orientation = 'auto' | 'portrait' | 'landscape';
export type Margin = 'none' | 'small' | 'large';

export interface ImagesOptions {
  size: PageSize;
  orientation: Orientation;
  margin: Margin;
}

export const DEFAULT_OPTIONS: ImagesOptions = { size: 'a4', orientation: 'auto', margin: 'small' };

/** Page sizes in PDF points (1/72 inch), portrait. */
export const PAGE_SIZES: Record<Exclude<PageSize, 'fit'>, { w: number; h: number }> = {
  a4: { w: 595.28, h: 841.89 },
  letter: { w: 612, h: 792 },
};

/** Margins in points: none, about 7 mm, about 18 mm. */
export const MARGINS: Record<Margin, number> = { none: 0, small: 20, large: 50 };

/** Screen pixels to points, treating images as 96 dpi like browsers do. */
const PX_TO_PT = 0.75;
/** PDF viewers refuse pages bigger than 200 inches on a side. */
const MAX_PAGE = 14400;

export interface Placement {
  pageW: number;
  pageH: number;
  /** Image box, from the bottom left like PDF coordinates. */
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Where an image of `width` x `height` pixels goes on its page. The image is
 * scaled to fit inside the margins, keeping its shape, and centred. With
 * "fit" the page takes the image's own size plus the margin.
 */
export function placeImage(width: number, height: number, options: ImagesOptions): Placement {
  const margin = MARGINS[options.margin];
  if (options.size === 'fit') {
    let w = width * PX_TO_PT;
    let h = height * PX_TO_PT;
    const scale = Math.min(1, (MAX_PAGE - 2 * margin) / Math.max(w, h));
    w *= scale;
    h *= scale;
    return { pageW: w + 2 * margin, pageH: h + 2 * margin, x: margin, y: margin, w, h };
  }
  const base = PAGE_SIZES[options.size];
  const landscape =
    options.orientation === 'landscape' || (options.orientation === 'auto' && width > height);
  const pageW = landscape ? base.h : base.w;
  const pageH = landscape ? base.w : base.h;
  const boxW = pageW - 2 * margin;
  const boxH = pageH - 2 * margin;
  const scale = Math.min(boxW / width, boxH / height);
  const w = width * scale;
  const h = height * scale;
  return { pageW, pageH, x: (pageW - w) / 2, y: (pageH - h) / 2, w, h };
}
