import { motion, useReducedMotion, type Transition } from 'framer-motion';
import { useId } from 'react';
import { useTheme } from '../theme/useTheme';

const spring: Transition = { type: 'spring', stiffness: 260, damping: 18 };
const RAY_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

/**
 * Sun that folds into a moon. A mask circle slides across the sun's body to
 * carve the crescent while the rays tuck away and the whole icon rolls.
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const reduced = useReducedMotion();
  const maskId = useId();
  const isDark = theme === 'dark';
  const next = isDark ? 'light' : 'dark';
  const t = reduced ? { duration: 0.2 } : spring;

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      whileTap={reduced ? undefined : { scale: 0.88 }}
      whileHover={reduced ? undefined : { scale: 1.06 }}
      transition={spring}
      className={`relative grid size-11 cursor-pointer place-items-center rounded-full border border-line bg-surface text-fg shadow-soft backdrop-blur-md transition-colors hover:border-line-strong ${className}`}
    >
      {reduced ? (
        <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
          <motion.g
            key={theme}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {isDark ? <MoonShape /> : <SunShape />}
          </motion.g>
        </svg>
      ) : (
        <motion.svg
          viewBox="0 0 24 24"
          className="size-6"
          aria-hidden="true"
          animate={{ rotate: isDark ? 40 : 90 }}
          transition={t}
        >
          <mask id={maskId}>
            <rect width="24" height="24" fill="white" />
            <motion.circle
              r="6"
              fill="black"
              initial={false}
              animate={isDark ? { cx: 16.5, cy: 7.5 } : { cx: 30, cy: -6 }}
              transition={t}
            />
          </mask>
          <motion.circle
            cx="12"
            cy="12"
            fill="currentColor"
            mask={`url(#${maskId})`}
            initial={false}
            animate={{ r: isDark ? 8.5 : 5 }}
            transition={t}
            style={{ color: isDark ? 'var(--fg)' : 'var(--sunshine)' }}
          />
          <motion.g
            stroke="var(--sunshine)"
            strokeWidth="2"
            strokeLinecap="round"
            initial={false}
            animate={{ opacity: isDark ? 0 : 1, scale: isDark ? 0.4 : 1 }}
            transition={t}
            style={{ originX: '12px', originY: '12px' }}
          >
            {RAY_ANGLES.map((angle) => (
              <line
                key={angle}
                x1="12"
                y1="2"
                x2="12"
                y2="4"
                transform={`rotate(${angle} 12 12)`}
              />
            ))}
          </motion.g>
        </motion.svg>
      )}
    </motion.button>
  );
}

function SunShape() {
  return (
    <g stroke="var(--sunshine)" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="5" fill="var(--sunshine)" stroke="none" />
      {RAY_ANGLES.map((angle) => (
        <line key={angle} x1="12" y1="2" x2="12" y2="4" transform={`rotate(${angle} 12 12)`} />
      ))}
    </g>
  );
}

function MoonShape() {
  return <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" fill="var(--fg)" />;
}
