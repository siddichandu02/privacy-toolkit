import {
  AnimatePresence,
  motion,
  useAnimationControls,
  useMotionValue,
  useSpring,
  type Transition,
} from 'framer-motion';
import { useStillMotion } from '../../useStillMotion';
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import type { Accent } from '../ui/accent';
import type { PipAccessory } from './accessories';

export type PipPose = 'sit' | 'wave' | 'puzzled' | 'hold' | 'celebrate' | 'shrug';

export interface PipProps {
  pose?: PipPose;
  /** Paper color. Defaults to coral, so Pip never reads as a stock orange fox. */
  accent?: Accent;
  /** Accessible name. Without it Pip is decorative and hidden from screen readers. */
  title?: string;
  className?: string;
  /** Eyes follow the mouse around the page. */
  watch?: boolean;
  /** Something to wear or hold, like a chef hat over Merge. */
  accessory?: PipAccessory | null;
}

/*
 * Three folds of the same sheet: light where the paper faces up, base on the
 * flat, shade on the far side of a crease. Mixing from the theme variable means
 * Pip follows light/dark mode and each tool's accent for free.
 */
const paper = (accent: Accent): CSSProperties =>
  ({
    '--pip': `var(--${accent})`,
    '--pip-base': 'var(--pip)',
    '--pip-light': 'color-mix(in srgb, var(--pip) 70%, white)',
    '--pip-shade': 'color-mix(in srgb, var(--pip) 72%, #1b1033)',
    '--pip-deep': 'color-mix(in srgb, var(--pip) 48%, #1b1033)',
  }) as CSSProperties;

const fill = (v: string): CSSProperties => ({ fill: `var(--pip-${v})` });
const WHITE = '#fbf9ff';
const WHITE_SHADE = '#e4ddf3';
const INK = '#1b1633';
const CREASE = {
  stroke: 'rgb(27 16 51 / 0.18)',
  strokeWidth: 0.8,
  strokeLinecap: 'round',
} as const;

/** One hop, then a breath on the ground before the next. */
const HOP: Transition = {
  duration: 1.1,
  times: [0, 0.3, 0.55, 1],
  ease: 'easeOut',
  repeat: Infinity,
};

const between = (min: number, max: number) => min + Math.random() * (max - min);

/** Schedules `fn` again and again at random intervals until unmounted. */
function useRandomTimer(enabled: boolean, min: number, max: number, fn: () => void) {
  const latest = useRef(fn);
  useEffect(() => {
    latest.current = fn;
  });
  useEffect(() => {
    if (!enabled) return;
    let id: ReturnType<typeof setTimeout>;
    const next = () => {
      id = setTimeout(
        () => {
          latest.current();
          next();
        },
        between(min, max),
      );
    };
    next();
    return () => clearTimeout(id);
  }, [enabled, min, max]);
}

/** How far the pupils can travel inside the eye, in viewBox units. */
const LOOK_X = 1.6;
const LOOK_Y = 1.3;

/**
 * Moves the eyes toward the mouse. Writes motion values only, so following
 * the pointer never re-renders Pip.
 */
function useLook(svg: RefObject<SVGSVGElement | null>, enabled: boolean) {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 300, damping: 26 });
  const y = useSpring(rawY, { stiffness: 300, damping: 26 });

  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = svg.current?.getBoundingClientRect();
        if (!box || box.width === 0) return;
        // Pip's eyes sit about a third of the way down the drawing.
        const dx = e.clientX - (box.left + box.width / 2);
        const dy = e.clientY - (box.top + box.height / 3);
        const d = Math.hypot(dx, dy) || 1;
        // Full look once the pointer is a little way off; softer up close.
        const k = Math.min(1, d / 160);
        rawX.set((dx / d) * k * LOOK_X);
        rawY.set((dy / d) * k * LOOK_Y);
      });
    };
    const away = () => {
      rawX.set(0);
      rawY.set(0);
    };
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', away);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', away);
    };
  }, [enabled, rawX, rawY, svg]);

  return { x, y };
}

/**
 * Pip, the paper fox. Built from flat folded facets so every part can move on
 * its own: ears twitch, eyes blink, tail sways, and a paw waves hello.
 */
export function Pip({
  pose = 'sit',
  accent = 'coral',
  title,
  className,
  watch = false,
  accessory = null,
}: PipProps) {
  const reduced = useStillMotion();
  const animated = !reduced;
  const svgRef = useRef<SVGSVGElement>(null);
  const look = useLook(svgRef, watch && animated);
  const [blink, setBlink] = useState(false);
  const leftEar = useAnimationControls();
  const rightEar = useAnimationControls();

  useRandomTimer(animated, 2200, 5600, () => {
    setBlink(true);
    setTimeout(() => setBlink(false), 130);
  });
  useRandomTimer(animated, 3800, 8500, () => {
    const ear = Math.random() < 0.5 ? leftEar : rightEar;
    const dir = ear === leftEar ? -1 : 1;
    void ear.start({
      rotate: [0, 14 * dir, -4 * dir, 0],
      transition: { duration: 0.45, ease: 'easeOut' },
    });
  });

  const tilt = pose === 'puzzled' ? 9 : pose === 'shrug' ? -7 : 0;
  const hop = animated && pose === 'celebrate';

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 160 180"
      className={className}
      style={paper(accent)}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      data-pose={pose}
      data-animated={animated}
      data-watching={watch && animated}
      overflow="visible"
    >
      <motion.ellipse
        cx="82"
        cy="172"
        rx="46"
        ry="5"
        fill="currentColor"
        opacity="0.12"
        style={{ originX: 0.5, originY: 0.5 }}
        animate={hop ? { scaleX: [1, 0.72, 1, 1] } : { scaleX: 1 }}
        transition={HOP}
      />

      <motion.g data-part="body" animate={hop ? { y: [0, -14, 0, 0] } : { y: 0 }} transition={HOP}>
        {/* Tail, behind the body */}
        <motion.g
          data-part="tail"
          style={{ originX: 0.05, originY: 0.95 }}
          animate={animated ? { rotate: [0, 6, 0] } : undefined}
          transition={{ duration: 3.4, ease: 'easeInOut', repeat: Infinity }}
        >
          <polygon points="94,168 148,92 146,146" style={fill('base')} />
          <polygon points="94,168 146,146 120,172" style={fill('shade')} />
          <polygon points="148,92 147.4,107 137.2,107.2" fill={WHITE} />
          <line x1="94" y1="168" x2="148" y2="92" {...CREASE} />
        </motion.g>

        {/* Body and chest */}
        <polygon points="52,170 80,170 80,100 62,100" style={fill('light')} />
        <polygon points="80,170 108,170 98,100 80,100" style={fill('base')} />
        <polygon points="80,104 92,128 80,156 68,128" fill={WHITE} />
        <polygon points="80,104 92,128 80,156" fill={WHITE_SHADE} />
        <polygon points="58,170 65,158 76,158 78,170" fill={WHITE} />
        <polygon points="82,170 84,158 95,158 102,170" fill={WHITE_SHADE} />

        {pose === 'wave' ? (
          <motion.g
            data-part="paw"
            style={{ originX: 0.1, originY: 1 }}
            animate={animated ? { rotate: [0, -24, 8, -24, 0] } : undefined}
            transition={{ duration: 1.4, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1.6 }}
          >
            <polygon points="92,112 104,121 130,84 120,77" style={fill('base')} />
            <polygon points="104,121 130,84 124,82" style={fill('shade')} />
            <polygon points="120,77 130,84 133,72 124,68" fill={WHITE} />
          </motion.g>
        ) : null}

        {pose === 'celebrate' ? (
          <motion.g
            data-part="paws"
            animate={hop ? { rotate: [0, -6, 0, 0] } : undefined}
            style={{ originX: 0.5, originY: 1 }}
            transition={HOP}
          >
            {/* Both paws thrown up past the ears. */}
            <polygon points="58,114 70,106 46,64 36,70" style={fill('light')} />
            <polygon points="58,114 46,64 40,67" style={fill('base')} />
            <polygon points="36,70 46,64 40,52 31,57" fill={WHITE} />
            <polygon points="90,106 102,114 124,70 114,64" style={fill('base')} />
            <polygon points="102,114 124,70 119,67" style={fill('shade')} />
            <polygon points="114,64 124,70 129,57 120,52" fill={WHITE_SHADE} />
          </motion.g>
        ) : null}

        {pose === 'shrug' ? (
          <g data-part="paws">
            {/* Left paw out to the side, palm up. */}
            <polygon points="68,110 64,124 38,114 36,102" style={fill('light')} />
            <polygon points="64,124 38,114 37,108" style={fill('base')} />
            <ellipse cx="34" cy="106" rx="7" ry="4.5" fill={WHITE} transform="rotate(-24 34 106)" />
          </g>
        ) : null}

        {pose === 'hold' ? (
          <g data-part="paw">
            {/* Reaches out to the right and grips a handle at about (142, 117). */}
            <polygon points="90,108 100,124 140,122 140,112" style={fill('base')} />
            <polygon points="100,124 140,122 140,118" style={fill('shade')} />
            <ellipse cx="142" cy="117" rx="6" ry="6.5" fill={WHITE} />
          </g>
        ) : null}

        {/* Head, ears and face move together when Pip tilts */}
        <motion.g
          data-part="head"
          style={{ originX: 0.5, originY: 0.95 }}
          initial={false}
          animate={{ rotate: tilt }}
          transition={{ type: 'spring', stiffness: 220, damping: 14 }}
        >
          <motion.g data-part="ear-left" style={{ originX: 0.5, originY: 1 }} animate={leftEar}>
            <polygon points="42,48 50,16 70,46" style={fill('base')} />
            <polygon points="50,44 52,27 63,45" style={fill('deep')} />
          </motion.g>
          <motion.g data-part="ear-right" style={{ originX: 0.5, originY: 1 }} animate={rightEar}>
            <polygon points="90,46 110,16 118,48" style={fill('shade')} />
            <polygon points="97,45 108,27 110,44" style={fill('deep')} />
          </motion.g>

          <polygon points="40,46 80,46 80,104" style={fill('base')} />
          <polygon points="80,46 120,46 80,104" style={fill('shade')} />
          <polygon points="56,46 104,46 80,64" style={fill('light')} />
          <polygon points="57,70 80,70 80,104" fill={WHITE} />
          <polygon points="80,70 103,70 80,104" fill={WHITE_SHADE} />
          <line x1="80" y1="46" x2="80" y2="104" {...CREASE} />
          <polygon points="75,96 85,96 80,103" fill={INK} />

          <motion.g
            data-part="eyes"
            data-blink={blink}
            style={{ originY: 0.5 }}
            animate={{ scaleY: blink ? 0.1 : 1 }}
            transition={{ duration: 0.07 }}
          >
            <motion.g data-part="pupils" style={{ x: look.x, y: look.y }}>
              <ellipse cx="66" cy="60" rx="3.6" ry="4.4" fill={INK} />
              <ellipse cx="94" cy="60" rx="3.6" ry="4.4" fill={INK} />
              <circle cx="67.2" cy="58.4" r="1.1" fill={WHITE} />
              <circle cx="95.2" cy="58.4" r="1.1" fill={WHITE} />
            </motion.g>
          </motion.g>

          <AnimatePresence>
            {accessory === 'chef-hat' || accessory === 'sunglasses' ? (
              <Worn key={accessory} kind={accessory} animated={animated} />
            ) : null}
          </AnimatePresence>
        </motion.g>

        {pose === 'shrug' ? (
          <motion.g
            data-part="scratch"
            style={{ originX: 0.15, originY: 1 }}
            animate={animated ? { rotate: [0, -7, 0, -7, 0] } : undefined}
            transition={{ duration: 0.9, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1.2 }}
          >
            {/* Right paw up behind the ear, scratching. */}
            <polygon points="92,112 104,120 124,62 113,58" style={fill('base')} />
            <polygon points="104,120 124,62 119,60" style={fill('shade')} />
            <ellipse cx="119" cy="55" rx="6.5" ry="7" fill={WHITE_SHADE} />
          </motion.g>
        ) : null}
      </motion.g>

      <AnimatePresence>
        {accessory && accessory !== 'chef-hat' && accessory !== 'sunglasses' ? (
          <Held key={accessory} kind={accessory} animated={animated} />
        ) : null}
      </AnimatePresence>

      {pose === 'puzzled' ? (
        <motion.text
          data-part="question"
          x="128"
          y="40"
          fontSize="30"
          fontWeight="800"
          fontFamily="var(--font-display)"
          style={fill('base')}
          animate={animated ? { y: [40, 34, 40], rotate: [8, 14, 8] } : undefined}
          transition={{ duration: 2.4, ease: 'easeInOut', repeat: Infinity }}
        >
          ?
        </motion.text>
      ) : null}
    </svg>
  );
}

const pop = (animated: boolean, origin: [number, number]) => ({
  style: { originX: `${origin[0]}px`, originY: `${origin[1]}px` },
  initial: animated ? { scale: 0, rotate: -20, opacity: 0 } : { opacity: 0 },
  animate: { scale: 1, rotate: 0, opacity: 1 },
  exit: animated ? { scale: 0, opacity: 0, transition: { duration: 0.12 } } : { opacity: 0 },
  transition: animated
    ? { type: 'spring' as const, stiffness: 520, damping: 17 }
    : { duration: 0.15 },
});

/** Things Pip wears on its head. Drawn in head space, so they tilt with it. */
function Worn({ kind, animated }: { kind: 'chef-hat' | 'sunglasses'; animated: boolean }) {
  if (kind === 'chef-hat') {
    return (
      <motion.g data-accessory="chef-hat" {...pop(animated, [80, 46])}>
        <rect
          x="62"
          y="34"
          width="36"
          height="12"
          rx="2"
          fill={WHITE}
          stroke={INK}
          strokeOpacity={0.15}
        />
        <path
          d="M62 36 C50 34 50 16 62 18 C62 6 80 4 82 14 C86 4 104 8 100 20 C112 18 110 36 98 36 Z"
          fill={WHITE}
          stroke={INK}
          strokeOpacity={0.15}
        />
        <path
          d="M72 34 V26 M80 34 V24 M88 34 V26"
          stroke={WHITE_SHADE}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </motion.g>
    );
  }
  return (
    <motion.g data-accessory="sunglasses" {...pop(animated, [80, 60])}>
      <path d="M54 56 H106" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
      <path d="M55 56 h21 l-2 8 a5 5 0 0 1 -5 4 h-7 a5 5 0 0 1 -5 -4 Z" fill={INK} />
      <path d="M84 56 h21 l-2 8 a5 5 0 0 1 -5 4 h-7 a5 5 0 0 1 -5 -4 Z" fill={INK} />
      <path
        d="M59 59 l5 0 M88 59 l5 0"
        stroke="white"
        strokeOpacity={0.55}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </motion.g>
  );
}

/** Things Pip holds up beside it, at the right paw. */
function Held({
  kind,
  animated,
}: {
  kind: Exclude<PipAccessory, 'chef-hat' | 'sunglasses'>;
  animated: boolean;
}) {
  const art: Record<typeof kind, ReactNode> = {
    knife: (
      <>
        <path
          d="M122 120 L150 66 Q156 60 154 72 L130 124 Z"
          fill="#dfe3ee"
          stroke={INK}
          strokeOpacity={0.25}
        />
        <rect
          x="114"
          y="118"
          width="12"
          height="22"
          rx="3"
          transform="rotate(26 120 129)"
          fill={INK}
        />
      </>
    ),
    dough: (
      <>
        <ellipse cx="140" cy="86" rx="20" ry="7" fill="#f6dcb0" stroke={INK} strokeOpacity={0.2} />
        <circle cx="134" cy="85" r="2.6" fill="var(--coral)" />
        <circle cx="146" cy="87" r="2.6" fill="var(--coral)" />
        <path
          d="M140 96 v14"
          stroke={INK}
          strokeOpacity={0.25}
          strokeWidth={1.4}
          strokeDasharray="2 3"
        />
      </>
    ),
    camera: (
      <>
        <rect x="122" y="92" width="34" height="24" rx="5" fill={INK} />
        <rect x="128" y="88" width="10" height="6" rx="2" fill={INK} />
        <circle cx="139" cy="104" r="8" fill="var(--sky)" stroke={WHITE} strokeWidth={2} />
        <circle cx="151" cy="96" r="1.8" fill="var(--sunshine)" />
      </>
    ),
    quill: (
      <>
        <path
          d="M128 126 C130 96 146 74 160 66 C158 88 146 110 128 126 Z"
          fill={WHITE}
          stroke={INK}
          strokeOpacity={0.2}
        />
        <path d="M128 126 L156 72" stroke={INK} strokeOpacity={0.35} strokeWidth={1.2} />
      </>
    ),
    suitcase: (
      <>
        <rect
          x="118"
          y="98"
          width="38"
          height="28"
          rx="5"
          fill="var(--sunshine)"
          stroke={INK}
          strokeOpacity={0.2}
        />
        <path
          d="M130 98 v-6 h14 v6"
          fill="none"
          stroke={INK}
          strokeOpacity={0.5}
          strokeWidth={2.4}
        />
        <path d="M118 110 h38" stroke={INK} strokeOpacity={0.2} />
      </>
    ),
    magnifier: (
      <>
        <circle
          cx="142"
          cy="94"
          r="12"
          fill="var(--sky)"
          fillOpacity={0.3}
          stroke={INK}
          strokeWidth={3}
        />
        <path d="M134 103 L124 118" stroke={INK} strokeWidth={5} strokeLinecap="round" />
      </>
    ),
    bubbles: (
      <>
        <circle cx="138" cy="96" r="9" fill="var(--sky)" fillOpacity={0.25} stroke="var(--sky)" />
        <circle cx="152" cy="82" r="6" fill="var(--mint)" fillOpacity={0.25} stroke="var(--mint)" />
        <circle
          cx="134"
          cy="76"
          r="4"
          fill="var(--violet)"
          fillOpacity={0.25}
          stroke="var(--violet)"
        />
      </>
    ),
    scissors: (
      <>
        <path
          d="M128 118 L154 80 M128 90 L152 122"
          stroke="#dfe3ee"
          strokeWidth={4}
          strokeLinecap="round"
        />
        <circle cx="124" cy="124" r="6" fill="none" stroke="var(--coral)" strokeWidth={3} />
        <circle cx="124" cy="86" r="6" fill="none" stroke="var(--coral)" strokeWidth={3} />
      </>
    ),
  };
  return (
    <motion.g data-accessory={kind} {...pop(animated, [126, 120])}>
      {art[kind]}
    </motion.g>
  );
}
