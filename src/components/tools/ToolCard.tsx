import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion';
import { useState, type CSSProperties, type DragEvent, type PointerEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { prefetchTool } from '../../routes/toolLoaders';
import { toolPath, type ToolInfo } from '../../tools';
import { handOff } from '../drop/handoff';
import { rulesFor } from '../drop/validate';
import { canTake, usePageDrop, useSetHoveredTool } from '../home/pageDrag';
import { sortFiles } from '../home/suggest';
import { accentFill, accentGlow, accentReady, accentSoft, type Accent } from '../ui/accent';
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

  // A file dragged over the home page: light up if this tool can open it.
  const navigate = useNavigate();
  const setHovered = useSetHoveredTool();
  const hoverOn = () => {
    setHovered?.(tool.id);
    if (tool.ready) prefetchTool(tool.id);
  };
  const hoverOff = () => setHovered?.((id) => (id === tool.id ? null : id));
  const peek = usePageDrop()?.peek ?? null;
  const takes = peek ? canTake(tool, peek) : false;
  const [hot, setHot] = useState(false);
  const isHot = hot && takes;
  const dragState = !peek ? 'idle' : takes ? 'takes' : 'skips';

  const drag = {
    onDragOver: (e: DragEvent) => {
      if (!takes) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      if (!hot) setHot(true);
    },
    onDragLeave: (e: DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHot(false);
    },
    onDrop: (e: DragEvent) => {
      setHot(false);
      if (!takes) return;
      const files = sortFiles(Array.from(e.dataTransfer.files))[tool.input.kind];
      // Not the kind this tool takes after all: the page shows what can open it.
      if (!files.length) return;
      e.preventDefault();
      const max = rulesFor(tool.input).maxFiles;
      handOff(tool.id, max ? files.slice(0, max) : files);
      navigate(toolPath(tool.id));
    },
  };

  const lift = reduced
    ? { opacity: dragState === 'skips' ? 0.4 : 1 }
    : dragState === 'takes'
      ? { opacity: 1, y: isHot ? -14 : -8, scale: isHot ? 1.035 : 1.015 }
      : dragState === 'skips'
        ? { opacity: 0.35, y: 0, scale: 0.97 }
        : { opacity: 1, y: 0, scale: 1 };

  return (
    <motion.div
      className={`relative h-full transition-[filter] duration-300 ${dragState === 'skips' ? 'saturate-[0.3]' : ''}`}
      data-drag={dragState}
      style={reduced ? undefined : { rotateX, rotateY, transformPerspective: 900 }}
      animate={lift}
      whileHover={reduced || peek ? undefined : { y: -4 }}
      transition={{ type: 'spring', stiffness: 400, damping: 24 }}
      {...drag}
    >
      {/* Can open the dragged file: a soft halo breathes behind the card. */}
      {takes ? (
        <span
          aria-hidden="true"
          data-testid="ready-halo"
          className="ready-halo"
          style={{ '--card-accent': `var(--${tool.accent})` } as CSSProperties}
        />
      ) : null}
      <Link
        to={toolPath(tool.id)}
        data-card
        style={{ '--card-accent': `var(--${tool.accent})` } as CSSProperties}
        aria-labelledby={`tool-${tool.id}-name`}
        aria-describedby={`tool-${tool.id}-blurb`}
        onPointerMove={track}
        onPointerEnter={hoverOn}
        onPointerLeave={() => {
          reset();
          hoverOff();
        }}
        onFocus={hoverOn}
        onBlur={hoverOff}
        className={`card-pull group relative grid h-full grid-cols-[auto_1fr] items-start gap-x-4 overflow-hidden rounded-card border border-line bg-surface p-4 shadow-soft backdrop-blur-xl transition-[box-shadow,border-color,scale,translate] duration-300 focus-visible:rounded-card ${takes ? accentReady[tool.accent] : 'hover:border-line-strong'} active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 sm:flex sm:flex-col sm:p-6 ${featured ? 'lg:grid lg:content-center lg:gap-x-7 lg:p-8' : ''} ${accentGlow[tool.accent]}`}
      >
        <span aria-hidden="true" className="card-spot" />
        <span aria-hidden="true" className="card-rim" />
        {/* ...and a bright arc runs around its edge. */}
        {takes ? (
          <span aria-hidden="true" className={`ready-rim ${isHot ? 'is-hot' : ''}`} />
        ) : null}
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
        <AnimatePresence>
          {isHot ? (
            <motion.span
              key="drop-here"
              aria-hidden="true"
              initial={{ opacity: 0, y: reduced ? 0 : 8, scale: reduced ? 1 : 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 26 }}
              className={`pointer-events-none absolute right-4 bottom-4 rounded-full px-3 py-1.5 text-sm font-bold shadow-soft ${accentFill[tool.accent]}`}
            >
              Let go to open
            </motion.span>
          ) : null}
        </AnimatePresence>
      </Link>
    </motion.div>
  );
}
