import { useReducedMotion, useReducedMotionConfig } from 'framer-motion';

/**
 * True when motion should stay still: the visitor's system asks for reduced
 * motion, or a surrounding MotionConfig forces it (used in tests).
 * useReducedMotionConfig alone ignores the system setting unless a
 * MotionConfig with reducedMotion="user" is present.
 */
export function useStillMotion(): boolean {
  const system = useReducedMotion();
  const config = useReducedMotionConfig();
  return Boolean(system || config);
}
