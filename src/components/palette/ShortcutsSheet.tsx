import type { ReactNode } from 'react';
import { Key, Sheet } from './Sheet';
import { modKey } from './store';

interface Shortcut {
  keys: ReactNode[];
  what: string;
}

function groups(mod: string): { title: string; where: string; items: Shortcut[] }[] {
  return [
    {
      title: 'Anywhere',
      where: 'Works on every page.',
      items: [
        { keys: [mod, 'K'], what: 'Search tools and actions' },
        { keys: ['?'], what: 'Show this list' },
        { keys: ['Esc'], what: 'Close a search or this list' },
      ],
    },
    {
      title: 'Home',
      where: 'On the page with every tool.',
      items: [{ keys: ['/'], what: 'Jump to the tool search box' }],
    },
    {
      title: 'Your files',
      where: 'In any tool once files are added.',
      items: [
        { keys: ['↑', '↓'], what: 'Move a file up or down (on its grip)' },
        { keys: [mod, 'Z'], what: 'Bring back a file you just removed' },
      ],
    },
    {
      title: 'Rotate pages',
      where: 'With a page selected.',
      items: [
        { keys: ['R'], what: 'Turn right' },
        { keys: ['Shift', 'R'], what: 'Turn left' },
        { keys: ['Delete'], what: 'Remove the page' },
      ],
    },
    {
      title: 'Crop and sign',
      where: 'On the photo frame or a placed signature.',
      items: [
        { keys: ['←', '↑', '→', '↓'], what: 'Nudge it' },
        { keys: ['Shift', '+ arrows'], what: 'Nudge in bigger steps' },
        { keys: ['+', '−'], what: 'Zoom the photo, or resize the signature' },
      ],
    },
    {
      title: 'Sign PDF page view',
      where: 'Anywhere on the page with your signature.',
      items: [
        { keys: [mod, '+'], what: 'Zoom in' },
        { keys: [mod, '−'], what: 'Zoom out' },
        { keys: [mod, '0'], what: 'Fit the whole page' },
        { keys: [mod, 'scroll'], what: 'Zoom where the pointer is' },
      ],
    },
  ];
}

/** Every keyboard shortcut on the site, opened with "?". */
export function ShortcutsSheet({ onClose }: { onClose: () => void }) {
  const list = groups(modKey());
  return (
    <Sheet label="Keyboard shortcuts" onClose={onClose} testId="shortcuts-sheet">
      <div className="flex items-start justify-between gap-4 border-b border-line px-6 pt-5 pb-4">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">Keyboard shortcuts</h2>
          <p className="mt-1 text-sm text-muted">Everything works without a mouse.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl text-muted transition-colors hover:bg-surface-strong hover:text-fg"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
            <path
              d="M6 6l12 12M18 6 6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      {/* Focusable so the list can be scrolled with arrow keys when it runs long. */}
      <div
        tabIndex={0}
        role="region"
        aria-label="Shortcut list"
        className="max-h-[min(60vh,32rem)] overflow-y-auto overscroll-contain px-6 py-2 focus-visible:outline-offset-[-3px]"
      >
        {list.map((g) => (
          <section key={g.title} className="border-b border-line py-4 last:border-b-0">
            <h3 className="font-display text-base font-bold tracking-tight">{g.title}</h3>
            <p className="text-xs text-muted">{g.where}</p>
            <dl className="mt-3 grid gap-2">
              {g.items.map((item) => (
                <div key={item.what} className="flex items-center justify-between gap-4">
                  <dt className="text-sm">{item.what}</dt>
                  <dd className="flex shrink-0 items-center gap-1">
                    {item.keys.map((k, i) => (
                      <Key key={i}>{k}</Key>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Sheet>
  );
}
