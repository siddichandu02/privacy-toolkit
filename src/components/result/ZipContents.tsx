import { useEffect, useRef, useState, type ReactNode } from 'react';
import { uniqueNames } from '../../lib/image/compress-names';
import { accentText, type Accent } from '../ui/accent';
import { openZip, type ZipFiles } from './zip-files';

export interface ZipItem {
  name: string;
  /** A short note on the right, e.g. the new size. */
  detail?: ReactNode;
}

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
  // Give the browser a moment to start the download before letting go of it.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

type RowState = 'idle' | 'saving' | 'saved' | 'failed';

/**
 * Every file in a ZIP result, each with its own save button, for when only
 * one or two are needed. The ZIP is opened on the first click, on this device.
 */
export function ZipContents({
  blob,
  items,
  accent,
  open = openZip,
}: {
  blob: Blob;
  items: readonly ZipItem[];
  accent: Accent;
  /** Injectable for tests. */
  open?: (blob: Blob) => Promise<ZipFiles>;
}) {
  const names = uniqueNames(items.map((i) => i.name));
  const files = useRef<Promise<ZipFiles> | null>(null);
  const [rows, setRows] = useState<Record<number, RowState>>({});
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  // A new ZIP means a new list.
  useEffect(() => {
    files.current = null;
  }, [blob]);

  const save = async (i: number) => {
    const name = names[i] ?? 'file';
    setRows((r) => ({ ...r, [i]: 'saving' }));
    try {
      files.current ??= open(blob);
      const list = await files.current;
      const file = list.find((f) => f.name === name) ?? list[i];
      if (!file) throw new Error('missing');
      saveBlob(await file.save(), name);
      if (live.current) setRows((r) => ({ ...r, [i]: 'saved' }));
    } catch {
      files.current = null;
      if (live.current) setRows((r) => ({ ...r, [i]: 'failed' }));
    }
  };

  const failed = Object.values(rows).includes('failed');

  return (
    <div className="min-w-0" data-testid="zip-contents">
      <p className="mb-2 text-sm text-muted">
        {items.length} files in the ZIP. Need just one? Save it on its own.
      </p>
      <ul className="max-h-56 divide-y divide-line overflow-y-auto rounded-2xl border border-line bg-canvas/40 text-sm">
        {items.map((item, i) => {
          const state = rows[i] ?? 'idle';
          const name = names[i] ?? item.name;
          return (
            <li key={i} className="flex min-w-0 items-center gap-3 py-1.5 pr-1.5 pl-3">
              <span className="min-w-0 flex-1 truncate font-medium text-fg" title={name}>
                {name}
              </span>
              {item.detail ? (
                <span className="shrink-0 text-muted tabular-nums">{item.detail}</span>
              ) : null}
              <button
                type="button"
                onClick={() => void save(i)}
                disabled={state === 'saving'}
                aria-label={`Save ${name}`}
                className={`grid size-9 shrink-0 place-items-center rounded-xl transition-[background-color,transform] hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-1 active:scale-90 disabled:opacity-60 ${
                  state === 'saved' ? accentText[accent] : 'text-muted hover:text-fg'
                }`}
                data-state={state}
              >
                {state === 'saved' ? <TickIcon /> : <SaveIcon spinning={state === 'saving'} />}
              </button>
            </li>
          );
        })}
      </ul>
      {failed ? (
        <p className="mt-2 text-sm text-coral" role="alert">
          That file could not be taken out of the ZIP. The ZIP itself is fine; download it instead.
        </p>
      ) : null}
    </div>
  );
}

function SaveIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`size-[18px] ${spinning ? 'motion-safe:animate-pulse' : ''}`}
      aria-hidden="true"
    >
      <path
        d="M10 3.5v9m0 0l-3.5-3.5M10 12.5l3.5-3.5M4 15.5h12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TickIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-[18px]" aria-hidden="true">
      <path
        d="M4.5 10.5l3.5 3.5 7.5-8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
