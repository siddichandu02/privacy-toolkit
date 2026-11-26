import { SWIPE_ARM, swipeRemoves } from './swipe';

describe('swipeRemoves', () => {
  it('removes after a long enough pull to the left', () => {
    expect(swipeRemoves(-SWIPE_ARM, 0, 360)).toBe(true);
    expect(swipeRemoves(-SWIPE_ARM + 10, 0, 360)).toBe(false);
  });

  it('needs less on a narrow slip', () => {
    expect(swipeRemoves(-70, 0, 150)).toBe(true);
  });

  it('takes a quick flick once the slip has moved a little', () => {
    expect(swipeRemoves(-40, -900, 360)).toBe(true);
    expect(swipeRemoves(-20, -900, 360)).toBe(false);
    expect(swipeRemoves(-40, -200, 360)).toBe(false);
  });

  it('never removes on a pull to the right', () => {
    expect(swipeRemoves(200, 1500, 360)).toBe(false);
  });
});
