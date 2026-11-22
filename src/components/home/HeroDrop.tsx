import { AnimatePresence, motion } from 'framer-motion';
import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { toolPath, type ToolInfo } from '../../tools';
import { useStillMotion } from '../../useStillMotion';
import { handOff } from '../drop/handoff';
import { IMAGE_RULES, PDF_RULES, extensionOf, formatBytes, rulesFor } from '../drop/validate';
import { Pip } from '../pip/Pip';
import { ToolIcon } from '../tools/ToolIcon';
import { accentSoft, accentText } from '../ui/accent';
import { usePageDrop } from './pageDrag';
import { sortFiles, suggestTools, type Sorted } from './suggest';

function describe(sorted: Sorted): string {
  const files = [...sorted.pdf, ...sorted.image];
  const first = files[0];
  if (!first) return '';
  const size = formatBytes(files.reduce((sum, f) => sum + f.size, 0));
  if (files.length === 1) return `${first.name}, ${size}`;
  const parts = [
    sorted.pdf.length ? `${sorted.pdf.length} PDF${sorted.pdf.length > 1 ? 's' : ''}` : null,
    sorted.image.length
      ? `${sorted.image.length} image${sorted.image.length > 1 ? 's' : ''}`
      : null,
  ].filter(Boolean);
  return `${parts.join(' and ')}, ${size} in total`;
}

const ACCEPT = [...PDF_RULES.extensions, ...IMAGE_RULES.extensions].join(',');

const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');

/**
 * The home page's first step: drop or pick any file, then choose from the
 * tools that can open it. The files are handed straight to that tool's page.
 */
export function HeroDrop({ className = '', id }: { className?: string; id?: string }) {
  const still = useStillMotion();
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const depth = useRef(0);
  const [over, setOver] = useState(false);
  const [ownSorted, setOwnSorted] = useState<Sorted | null>(null);
  // On the home page the whole page takes drops, so the files live there.
  const page = usePageDrop();
  const sorted = page ? page.sorted : ownSorted;
  const setSorted = page ? page.setSorted : setOwnSorted;
  const headingId = useId();

  const usable = sorted ? sorted.pdf.length + sorted.image.length : 0;
  const tools = sorted && usable ? suggestTools(sorted) : [];
  const unsupported = sorted && usable === 0 ? sorted.other : [];

  const take = (files: File[]) => {
    if (files.length) setSorted(sortFiles(files));
  };
  const open = () => input.current?.click();
  const reset = () => {
    setSorted(null);
    // Back to the zone, so keyboard users are not left on a removed button.
    requestAnimationFrame(() => document.getElementById(`${headingId}-zone`)?.focus());
  };

  const pick = (tool: ToolInfo) => {
    if (!sorted) return;
    const files = sorted[tool.input.kind];
    const max = rulesFor(tool.input).maxFiles;
    handOff(tool.id, max ? files.slice(0, max) : files);
    navigate(toolPath(tool.id));
  };

  const drag = {
    onDragEnter: (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current += 1;
      setOver(true);
    },
    onDragOver: (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    },
    onDragLeave: () => {
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setOver(false);
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      depth.current = 0;
      setOver(false);
      take(Array.from(e.dataTransfer.files));
    },
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
    }
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    take(Array.from(e.target.files ?? []));
    e.target.value = '';
  };

  const fade = still
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
      };

  return (
    <div id={id} className={`relative scroll-mt-24 ${className}`} {...drag}>
      {/* Pip perches on the top edge and leans in when a file hovers. */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute right-6 bottom-full -mb-2 h-16 sm:right-10 sm:h-24"
        animate={still ? undefined : { y: over ? -8 : 0, rotate: over ? -6 : 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 18 }}
      >
        <Pip pose={over ? 'celebrate' : tools.length ? 'hold' : 'wave'} className="h-full" />
      </motion.div>

      <motion.div
        data-testid="hero-drop"
        data-dragging={over}
        animate={still ? undefined : over ? { scale: 1.015, y: -4 } : { scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 24 }}
        className={`relative overflow-hidden rounded-panel border-2 border-dashed backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-200 ${
          over
            ? 'border-violet bg-violet/12 shadow-glow-violet'
            : 'border-line-strong bg-surface shadow-soft'
        }`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {tools.length && sorted ? (
            <motion.div
              key="pick"
              {...fade}
              transition={{ duration: 0.2 }}
              className="p-5 sm:p-6"
              role="group"
              aria-labelledby={headingId}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 id={headingId} className="font-display text-xl font-bold tracking-tight">
                    What should we do with it?
                  </h2>
                  <p className="mt-0.5 truncate text-sm text-muted" data-testid="hero-drop-file">
                    {describe(sorted)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={reset}
                  className="shrink-0 rounded-lg text-sm font-semibold text-muted transition-colors hover:text-coral"
                >
                  Pick another
                </button>
              </div>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {tools.map((tool, i) => (
                  <motion.li
                    key={tool.id}
                    className={i === 0 ? 'sm:col-span-2' : undefined}
                    initial={still ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: still ? 0 : 0.04 * i, duration: 0.2 }}
                  >
                    <motion.button
                      type="button"
                      onClick={() => pick(tool)}
                      whileHover={still ? undefined : { y: -2 }}
                      whileTap={still ? undefined : { scale: 0.97 }}
                      className={`flex w-full items-center gap-3 rounded-control border border-line bg-surface p-2.5 text-left font-semibold transition-colors hover:border-line-strong hover:bg-surface-strong`}
                    >
                      <span
                        aria-hidden="true"
                        className={`flex size-9 shrink-0 items-center justify-center rounded-xl border ${accentSoft[tool.accent]}`}
                      >
                        <ToolIcon id={tool.id} className="size-5" />
                      </span>
                      <span className="min-w-0">
                        {tool.name}
                        {i === 0 ? (
                          <span className="block text-sm font-medium text-muted">{tool.blurb}</span>
                        ) : null}
                      </span>
                    </motion.button>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          ) : (
            <motion.div key="drop" {...fade} transition={{ duration: 0.2 }}>
              <div
                id={`${headingId}-zone`}
                role="button"
                tabIndex={0}
                aria-label="Choose a file to start"
                aria-describedby={`${headingId}-hint`}
                onClick={open}
                onKeyDown={onKeyDown}
                className="group flex cursor-pointer items-center gap-4 rounded-panel px-5 py-5 focus-visible:rounded-panel sm:gap-5 sm:px-7 sm:py-8"
              >
                <DropArt lifted={over} still={still} />
                <div className="min-w-0">
                  <p className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                    {over ? (
                      'Let go'
                    ) : (
                      <>
                        <span className="pointer-coarse:hidden">Drop a file to start</span>
                        <span className="hidden pointer-coarse:inline">Choose a file to start</span>
                      </>
                    )}
                  </p>
                  <p id={`${headingId}-hint`} className="mt-1.5 text-[0.95rem] text-muted">
                    A PDF or a photo.{' '}
                    <span className="font-semibold text-fg underline decoration-violet/60 decoration-2 underline-offset-4 group-hover:decoration-violet">
                      Browse your files
                    </span>
                  </p>
                </div>
              </div>
              {unsupported.length ? (
                <p
                  role="alert"
                  className="mx-5 -mt-2 mb-5 rounded-xl bg-coral/12 px-4 py-3 text-sm sm:mx-7"
                >
                  <span className={`font-semibold ${accentText.coral}`}>
                    {unsupported.length === 1
                      ? `${
                          extensionOf(unsupported[0]?.name ?? '')
                            .toUpperCase()
                            .slice(1) || 'This'
                        } files can't be opened yet.`
                      : "These files can't be opened yet."}
                  </span>{' '}
                  Try a PDF or a JPG, PNG, HEIC or WebP photo.
                </p>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <input
        ref={input}
        type="file"
        multiple
        accept={ACCEPT}
        onChange={onChange}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        data-testid="hero-file-input"
      />
    </div>
  );
}

/** A PDF sheet and a photo, fanned. They spread apart when a file hovers. */
function DropArt({ lifted, still }: { lifted: boolean; still: boolean }) {
  const spring = { type: 'spring' as const, stiffness: 320, damping: 20 };
  return (
    <svg
      viewBox="0 0 64 56"
      className="h-14 w-16 shrink-0 sm:h-16 sm:w-[4.5rem]"
      aria-hidden="true"
    >
      <motion.g
        animate={still ? undefined : { rotate: lifted ? -16 : -8, x: lifted ? -4 : 0 }}
        transition={spring}
        style={{ originX: '28px', originY: '50px' }}
      >
        <rect x={10} y={8} width={30} height={40} rx={4} className="fill-coral" />
        <path
          d="M16 18h18M16 24h18M16 30h12"
          stroke="white"
          strokeWidth={2.4}
          strokeLinecap="round"
          opacity={0.9}
        />
      </motion.g>
      <motion.g
        animate={
          still ? undefined : { rotate: lifted ? 16 : 8, x: lifted ? 4 : 0, y: lifted ? -3 : 0 }
        }
        transition={spring}
        style={{ originX: '36px', originY: '50px' }}
      >
        <rect
          x={26}
          y={12}
          width={30}
          height={36}
          rx={4}
          fill="#fbf9ff"
          stroke="#1b1633"
          strokeOpacity={0.15}
        />
        <rect x={29} y={15} width={24} height={22} rx={2} className="fill-sky" />
        <circle cx={47} cy={20} r={3} className="fill-sunshine" />
        <path d="M29 37 L37 27 L43 33 L47 29 L53 37 Z" className="fill-mint" />
      </motion.g>
    </svg>
  );
}
