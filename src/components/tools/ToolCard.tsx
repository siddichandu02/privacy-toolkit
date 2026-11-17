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
interface ToolCardProps {
  tool: ToolInfo;
  /** Wide layout with a bigger icon, used for the first card on large screens. */
  featured?: boolean;
}

export function ToolCard({ tool, featured = false }: ToolCardProps) {
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
        aria-labelledby={`tool-${tool.id}-name`}
        aria-describedby={`tool-${tool.id}-blurb`}
        onPointerMove={track}
        onPointerLeave={reset}
        className={`group relative grid h-full grid-cols-[auto_1fr] items-start gap-x-4 overflow-hidden rounded-card border border-line bg-surface p-4 shadow-soft backdrop-blur-xl transition-[box-shadow,border-color] duration-300 hover:border-line-strong focus-visible:rounded-card sm:flex sm:flex-col sm:p-6 ${featured ? 'lg:grid lg:content-center lg:gap-x-7 lg:p-8' : ''} ${accentGlow[tool.accent]}`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-0 right-0 size-8 rounded-bl-xl bg-linear-to-bl from-canvas from-50% to-50% transition-[width,height] duration-300 ease-spring group-hover:size-12 group-focus-visible:size-12 motion-reduce:transition-none sm:size-9 ${fold[tool.accent]}`}
        />
        <span
          className={`flex size-11 items-center justify-center rounded-2xl border sm:size-12 ${featured ? 'lg:row-span-2 lg:size-20 lg:rounded-3xl' : ''} ${accentSoft[tool.accent]}`}
        >
          <ToolIcon id={tool.id} className={`size-6 ${featured ? 'lg:size-10' : ''}`} />
        </span>
        <div className={featured ? 'lg:max-w-md' : undefined}>
          <h3
            id={`tool-${tool.id}-name`}
            className={`pr-6 font-display text-lg font-bold tracking-tight sm:mt-5 sm:pr-0 sm:text-xl ${featured ? 'lg:mt-0 lg:text-3xl' : ''}`}
          >
            {tool.name}
          </h3>
          <p
            id={`tool-${tool.id}-blurb`}
            className={`mt-1 text-[0.95rem] leading-relaxed text-muted sm:mt-1.5 ${featured ? 'lg:text-lg' : ''}`}
          >
            {tool.blurb}
          </p>
        </div>
        <span
          className={`mt-auto hidden pt-5 text-sm font-medium text-muted sm:block ${featured ? 'lg:col-start-2 lg:mt-0 lg:pt-3' : ''}`}
        >
          {tool.category === 'pdf' ? 'PDF' : 'Image'}
        </span>
      </Link>
    </motion.div>
  );
}
