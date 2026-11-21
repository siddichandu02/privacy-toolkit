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
