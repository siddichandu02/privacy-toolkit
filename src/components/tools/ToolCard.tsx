import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import type { PointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { toolPath, type ToolInfo } from '../../tools';
import { accentGlow, accentSoft, type Accent } from '../ui/accent';
import { ToolIcon } from './ToolIcon';

/** The folded corner, in the tool's color. Full strings so Tailwind keeps them. */
const fold: Record<Accent, string> = {
  violet: 'to-violet/35',
  coral: 'to-coral/35',
  mint: 'to-mint/35',
  sunshine: 'to-sunshine/35',
  sky: 'to-sky/35',
};

const MAX_TILT = 7;
const spring = { stiffness: 260, damping: 20, mass: 0.6 };

/**
 * A tool as a sheet of paper: glass card, dog-eared corner that peels a little
 * further on hover, and a gentle tilt toward the mouse.
 */
export function ToolCard({ tool }: { tool: ToolInfo }) {
  const reduced = useReducedMotion();
  // Pointer position over the card, -0.5 to 0.5 on each axis.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [MAX_TILT, -MAX_TILT]), spring);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-MAX_TILT, MAX_TILT]), spring);

  const track = (e: PointerEvent<HTMLElement>) => {
    if (reduced || e.pointerType !== 'mouse') return;
    const box = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - box.left) / box.width - 0.5);
    py.set((e.clientY - box.top) / box.height - 0.5);
  };
  const reset = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <motion.div
      className="h-full"
      style={reduced ? undefined : { rotateX, rotateY, transformPerspective: 900 }}
      whileHover={reduced ? undefined : { y: -4 }}
      whileTap={reduced ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 24 }}
    >
      <Link
        to={toolPath(tool.id)}
        onPointerMove={track}
        onPointerLeave={reset}
        className={`group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface p-5 shadow-soft backdrop-blur-xl transition-[box-shadow,border-color] duration-300 hover:border-line-strong focus-visible:rounded-card sm:p-6 ${accentGlow[tool.accent]}`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-0 right-0 size-9 rounded-bl-xl bg-linear-to-bl from-canvas from-50% to-50% transition-[width,height] duration-300 ease-spring group-hover:size-12 group-focus-visible:size-12 motion-reduce:transition-none ${fold[tool.accent]}`}
        />
        <span
          className={`flex size-12 items-center justify-center rounded-2xl border ${accentSoft[tool.accent]}`}
        >
          <ToolIcon id={tool.id} className="size-6" />
        </span>
        <h3 className="mt-5 font-display text-xl font-bold tracking-tight">{tool.name}</h3>
        <p className="mt-1.5 text-[0.95rem] leading-relaxed text-muted">{tool.blurb}</p>
        <span className="mt-auto pt-5 text-sm font-medium text-muted">
          {tool.category === 'pdf' ? 'PDF' : 'Image'}
        </span>
      </Link>
    </motion.div>
  );
}
