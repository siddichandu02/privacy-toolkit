import { describe, expect, it } from 'vitest';
import {
  canvasAreaFor,
  DESKTOP_CANVAS_AREA,
  fitCanvas,
  isWebKitOnly,
  WEBKIT_CANVAS_AREA,
} from './canvas-limit';

const UA = {
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  iphoneChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0 Mobile/15E148 Safari/604.1',
  macSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  macChrome:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  android:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
};

describe('isWebKitOnly', () => {
  it('spots Safari and every iPhone browser', () => {
    expect(isWebKitOnly(UA.iphone)).toBe(true);
    expect(isWebKitOnly(UA.iphoneChrome)).toBe(true);
    expect(isWebKitOnly(UA.macSafari)).toBe(true);
  });

  it('leaves Chrome, Android and Firefox alone', () => {
    expect(isWebKitOnly(UA.macChrome)).toBe(false);
    expect(isWebKitOnly(UA.android)).toBe(false);
    expect(isWebKitOnly(UA.firefox)).toBe(false);
  });

  it('picks the area limit to match', () => {
    expect(canvasAreaFor(UA.iphone)).toBe(WEBKIT_CANVAS_AREA);
    expect(canvasAreaFor(UA.android)).toBe(DESKTOP_CANVAS_AREA);
  });
});

describe('fitCanvas', () => {
  it('keeps sizes that fit', () => {
    expect(fitCanvas(4032, 3024, WEBKIT_CANVAS_AREA)).toEqual({
      width: 4032,
      height: 3024,
      shrunk: false,
    });
  });

  it('scales a 24 MP iPhone photo down to fit Safari, keeping its shape', () => {
    const out = fitCanvas(5712, 4284, WEBKIT_CANVAS_AREA);
    expect(out.shrunk).toBe(true);
    expect(out.width * out.height).toBeLessThanOrEqual(WEBKIT_CANVAS_AREA);
    expect(out.width / out.height).toBeCloseTo(5712 / 4284, 2);
    // About 17% off each side.
    expect(out.width).toBeGreaterThan(5712 * 0.8);
  });

  it('caps the longest side of a very wide panorama', () => {
    const out = fitCanvas(40_000, 1_000, DESKTOP_CANVAS_AREA);
    expect(out).toEqual({ width: 16_384, height: 409, shrunk: true });
  });

  it('never goes below 1 pixel', () => {
    expect(fitCanvas(1_000_000, 1, 100)).toMatchObject({ height: 1 });
  });
});
