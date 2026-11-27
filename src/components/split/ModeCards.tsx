import { motion } from 'framer-motion';
import { useId, type CSSProperties } from 'react';
import type { SplitMode } from '../../lib/pdf/split-plan';
import { useStillMotion } from '../../useStillMotion';
import type { Accent } from '../ui/accent';
import { partColor } from './partColors';

interface ModeInfo {
  id: SplitMode;
  title: string;
  blurb: (pageCount: number) => string;
}

const SPLIT_MODES: readonly ModeInfo[] = [
  {
    id: 'extract',
    title: 'Extract pages',
    blurb: () => 'Pick pages and get one new PDF with only those.',
  },
  {
    id: 'parts',
    title: 'Split into parts',
    blurb: () => 'Each range becomes its own PDF, all in one zip.',
  },
  {
    id: 'every',
    title: 'Split every page',
    blurb: (n) => (n > 1 ? `${n} PDFs, one for each page, in one zip.` : 'One PDF for each page.'),
  },
];

interface ModeCardsProps {
  accent: Accent;
  mode: SplitMode;
  pageCount: number;
  onChange: (mode: SplitMode) => void;
}

/**
 * Three big radio cards, each with a small drawing of pages going in and
 * files coming out, so the difference shows before anything is read.
 */
export function ModeCards({ accent, mode, pageCount, onChange }: ModeCardsProps) {
  const name = useId();
  const still = useStillMotion();
  // One page can only ever make one file, so the splitting modes would
  // give the same result as extracting.
  const single = pageCount === 1;
  return (
    <fieldset>
      <legend className="font-display text-xl font-bold tracking-tight">What do you want?</legend>
      {single ? (
        <p className="mt-1 text-sm text-muted">This PDF has 1 page, so it can only be extracted.</p>
      ) : null}
      <div className="mt-3 grid gap-2 sm:grid-cols-3 sm:gap-3">
        {SPLIT_MODES.map((m) => {
          const on = m.id === mode;
          const off = single && m.id !== 'extract';
          return (
            <label
              key={m.id}
              data-testid={`split-mode-${m.id}`}
              className={`group relative flex cursor-pointer items-center gap-3 rounded-2xl border-2 py-3 pr-9 pl-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--pick)] sm:flex-col sm:items-start sm:gap-3 sm:p-4 sm:pr-4 ${
                on
                  ? 'border-[var(--pick)] bg-[color-mix(in_srgb,var(--pick)_9%,transparent)]'
                  : 'border-line bg-canvas/40 hover:border-line-strong'
              } ${off ? 'cursor-not-allowed opacity-45 hover:border-line' : ''}`}
              style={{ '--pick': `var(--${accent})` } as CSSProperties}
            >
              <input
                type="radio"
                name={name}
                value={m.id}
                checked={on}
                disabled={off}
                onChange={() => onChange(m.id)}
                className="sr-only"
              />
              <motion.span
                aria-hidden="true"
                className="block w-20 shrink-0 sm:w-full"
                animate={on && !still ? { y: [0, -3, 0] } : { y: 0 }}
                transition={{ duration: 0.35 }}
              >
                <ModeDiagram mode={m.id} accent={accent} on={on} />
              </motion.span>
              <span className="min-w-0">
                <span className="block font-display text-base leading-tight font-bold tracking-tight sm:text-lg">
                  {m.title}
                </span>
                <span className="mt-0.5 block text-[0.8125rem] leading-snug text-muted sm:text-sm">
                  {m.blurb(pageCount)}
                </span>
              </span>
              <span
                aria-hidden="true"
                className={`absolute top-1/2 right-3 grid size-5 -translate-y-1/2 place-items-center rounded-full border-2 transition-colors sm:top-3 sm:translate-y-0 ${
                  on ? 'border-[var(--pick)] bg-[var(--pick)]' : 'border-line-strong'
                }`}
              >
                {on ? (
                  <svg viewBox="0 0 12 12" className="size-3">
                    <path
                      d="M2.5 6.2 5 8.5l4.5-5"
                      fill="none"
                      stroke="var(--canvas)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** A tiny sheet: rounded rect with two text lines. */
function Sheet({
  x,
  y,
  fill,
  w = 13,
  h = 17,
}: {
  x: number;
  y: number;
  fill?: string;
  w?: number;
  h?: number;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect
        width={w}
        height={h}
        rx="2.5"
        fill={fill ?? 'var(--canvas-raised)'}
        stroke={fill ?? 'var(--line-strong)'}
        strokeWidth="1.2"
      />
      <path
        d={`M3 ${h * 0.35}h${w - 6}M3 ${h * 0.58}h${w - 8}`}
        stroke={fill ? 'var(--canvas)' : 'var(--line-strong)'}
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity={fill ? 0.75 : 1}
      />
    </g>
  );
}

/** Four source pages on the left, an arrow, and what comes out on the right. */
function ModeDiagram({ mode, accent, on }: { mode: SplitMode; accent: Accent; on: boolean }) {
  const a = partColor(0, accent);
  const b = partColor(1, accent);
  const muted = on ? undefined : 'var(--line-strong)';
  const ink = (c: string) => muted ?? c;
  const sources =
    mode === 'extract'
      ? [undefined, ink(a), ink(a), undefined]
      : mode === 'parts'
        ? [ink(a), ink(a), ink(b), ink(b)]
        : [ink(a), ink(b), ink(partColor(2, accent)), ink(partColor(3, accent))];
  return (
    <svg viewBox="0 0 120 40" className="h-auto w-full max-w-36">
      {sources.map((fill, i) => (
        <Sheet key={i} x={2 + i * 11} y={11 - (i % 2) * 2} fill={fill} w={11} h={15} />
      ))}
      <path
        d="M54 20h12m-4-4 4 4-4 4"
        fill="none"
        stroke="var(--muted)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {mode === 'extract' ? (
        <>
          <Sheet x={80} y={7} fill={ink(a)} w={19} h={25} />
          <Sheet x={76} y={10} fill={ink(a)} w={19} h={25} />
        </>
      ) : mode === 'parts' ? (
        <>
          <Sheet x={76} y={6} fill={ink(a)} w={15} h={20} />
          <Sheet x={73} y={9} fill={ink(a)} w={15} h={20} />
          <Sheet x={100} y={11} fill={ink(b)} w={15} h={20} />
          <Sheet x={97} y={14} fill={ink(b)} w={15} h={20} />
        </>
      ) : (
        sources.map((fill, i) => (
          <Sheet key={i} x={73 + i * 11.5} y={9 + (i % 2) * 6} fill={fill} w={10} h={14} />
        ))
      )}
    </svg>
  );
}
