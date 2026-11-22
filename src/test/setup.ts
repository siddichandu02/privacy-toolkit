import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { MotionGlobalConfig } from 'framer-motion';

afterEach(() => {
  cleanup();
});

// jsdom has no layout, so scrolling APIs are missing.
Element.prototype.scrollIntoView = () => {};
window.scrollTo = () => {};

// Finish every framer-motion animation at once. Fades otherwise run on
// jsdom's timer-based frames, and a busy CI machine can catch an element
// still at opacity 0.
MotionGlobalConfig.skipAnimations = true;

// jsdom has no IntersectionObserver. Scroll-driven parts just never see anything
// come into view; tests that need it stub their own.
if (!('IntersectionObserver' in globalThis)) {
  class NoopObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  Object.assign(globalThis, { IntersectionObserver: NoopObserver });
}
