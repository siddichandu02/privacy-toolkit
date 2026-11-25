/**
 * Zoom maths for the signature placer. Zoom 1 is the page at its real size
 * (72 points to 96 CSS pixels), like most PDF viewers.
 */

export const PT_TO_PX = 96 / 72;
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;
/** Stops for the + and - buttons. */
export const ZOOM_STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4] as const;
/** Space around the page inside the viewer, in CSS pixels. */
export const VIEW_PAD = 16;

export interface Size {
  width: number;
  height: number;
}

export type FitMode = 'page' | 'width';

export function clampZoom(zoom: number) {
  if (!Number.isFinite(zoom)) return 1;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/** The next stop above (dir 1) or below (dir -1) the current zoom. */
export function stepZoom(zoom: number, dir: 1 | -1) {
  const eps = 0.005;
  if (dir > 0) return ZOOM_STEPS.find((s) => s > zoom + eps) ?? MAX_ZOOM;
  return [...ZOOM_STEPS].reverse().find((s) => s < zoom - eps) ?? MIN_ZOOM;
}

/** Zoom that shows the whole page, or the full page width, in the viewer. */
export function fitZoom(view: Size, page: Size, mode: FitMode, pad = VIEW_PAD) {
  const w = Math.max(1, view.width - pad * 2) / Math.max(1, page.width);
  if (mode === 'width') return clampZoom(w);
  const h = Math.max(1, view.height - pad * 2) / Math.max(1, page.height);
  return clampZoom(Math.min(w, h));
}

/** Where the page starts along one axis: centred, or at the padding when it is bigger. */
export function pageOffset(view: number, page: number, pad = VIEW_PAD) {
  return Math.max(pad, (view - page) / 2);
}

/** Scrollable size along one axis. */
export function contentSize(view: number, page: number, pad = VIEW_PAD) {
  return Math.max(view, page + pad * 2);
}

/**
 * Scroll position along one axis that keeps the page point under `anchor`
 * (measured from the viewer's edge) in place when the zoom goes from z0 to z1.
 */
export function anchorScroll(o: {
  scroll: number;
  anchor: number;
  view: number;
  /** Page length along this axis at zoom 1, in CSS pixels. */
  page: number;
  z0: number;
  z1: number;
  pad?: number;
}) {
  const pad = o.pad ?? VIEW_PAD;
  const off0 = pageOffset(o.view, o.page * o.z0, pad);
  const off1 = pageOffset(o.view, o.page * o.z1, pad);
  const point = (o.scroll + o.anchor - off0) / o.z0;
  const next = point * o.z1 + off1 - o.anchor;
  const max = contentSize(o.view, o.page * o.z1, pad) - o.view;
  return Math.min(Math.max(0, max), Math.max(0, next));
}

/**
 * Width to ask pdf.js for. Rounded up to steps so small zoom changes reuse
 * the last drawing, and capped so a big zoom can't ask for a huge canvas.
 */
export function renderWidth(shown: number, cap = 3200) {
  const step = 160;
  return Math.min(cap, Math.max(step, Math.ceil(shown / step) * step));
}

export const zoomLabel = (zoom: number) => `${Math.round(zoom * 100)}%`;
