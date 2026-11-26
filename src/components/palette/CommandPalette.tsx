import { motion } from 'framer-motion';
import { useId, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { install, useInstallReach } from '../../offline/install';
import { prefetchTool } from '../../routes/toolLoaders';
import { useTheme } from '../../theme/useTheme';
import { getTool, rankTools, TOOLS, toolPath, type ToolInfo } from '../../tools';
import { useStillMotion } from '../../useStillMotion';
import { Pip } from '../pip/Pip';
import { ToolIcon } from '../tools/ToolIcon';
import { useToast } from '../ui';
import { accentSoft, accentText, type Accent } from '../ui/accent';
import { useRecentTools } from './recent';
import { Key, Sheet } from './Sheet';
import { openOverlay } from './store';

interface Command {
  key: string;
  group: 'Recent' | 'Tools' | 'Actions';
  title: string;
  detail: string;
  accent: Accent;
  icon: ReactNode;
  /** Text an action is found by; tools use their own ranking. */
  words?: string;
  tool?: ToolInfo;
  run: () => void;
}

const fold = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Ctrl/Cmd+K search over every tool, the tools opened lately, and a few actions. */
export function CommandPalette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { theme, toggleTheme } = useTheme();
  const recent = useRecentTools();
  const reach = useInstallReach();
  const { toast } = useToast();
  const still = useStillMotion();
  const listId = useId();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const commands = useMemo(() => {
    const openTool = (tool: ToolInfo) => () => {
      onClose();
      if (pathname !== toolPath(tool.id)) void navigate(toolPath(tool.id));
    };
    const toolCommand = (tool: ToolInfo, group: Command['group']): Command => ({
      key: `${group}-${tool.id}`,
      group,
      title: tool.name,
      detail: tool.ready ? tool.blurb : 'Being built right now',
      accent: tool.accent,
      icon: <ToolIcon id={tool.id} className="size-5" />,
      tool,
      run: openTool(tool),
    });

    const actions: Command[] = [
      {
        key: 'theme',
        group: 'Actions',
        title: theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
        detail: 'Change how the site looks. It remembers your pick.',
        accent: 'sunshine',
        icon: theme === 'dark' ? <SunIcon /> : <MoonIcon />,
        words: 'theme light dark mode colors',
        run: () => {
          toggleTheme();
          onClose();
        },
      },
      {
        key: 'shortcuts',
        group: 'Actions',
        title: 'Keyboard shortcuts',
        detail: 'Every key that does something on this site.',
        accent: 'sky',
        icon: <KeysIcon />,
        words: 'keyboard shortcuts keys help hotkeys',
        run: () => openOverlay('shortcuts'),
      },
      {
        key: 'home',
        group: 'Actions',
        title: 'Go to all tools',
        detail: 'The home page with every tool.',
        accent: 'violet',
        icon: <HomeIcon />,
        words: 'home all tools start page',
        run: () => {
          onClose();
          if (pathname !== '/') void navigate('/');
        },
      },
    ];

    if (reach === 'prompt' || reach === 'ios') {
      actions.push({
        key: 'install',
        group: 'Actions',
        title: reach === 'ios' ? 'Add to Home Screen' : 'Install the app',
        detail: 'Its own window, works with no connection.',
        accent: 'mint',
        icon: <InstallIcon />,
        words: 'install app home screen offline pwa desktop add download',
        run: () => {
          if (reach === 'ios') {
            openOverlay('install');
            return;
          }
          onClose();
          void install().then((added) => {
            if (added) {
              toast({
                title: 'Added to your apps',
                description: 'It opens in its own window and works offline.',
                tone: 'success',
              });
            }
          });
        },
      });
    }

    const q = fold(query);
    if (!q) {
      const recentTools = recent
        .map((id) => getTool(id))
        .filter((t): t is ToolInfo => !!t)
        .map((t) => toolCommand(t, 'Recent'));
      const recentIds = new Set(recent);
      return [
        ...recentTools,
        ...TOOLS.filter((t) => !recentIds.has(t.id)).map((t) => toolCommand(t, 'Tools')),
        ...actions,
      ];
    }
    const words = q.split(' ');
    return [
      ...rankTools(TOOLS, q).map((t) => toolCommand(t, 'Tools')),
      ...actions.filter((a) => {
        const hay = fold(`${a.title} ${a.words ?? ''}`);
        return words.every((w) => hay.includes(w));
      }),
    ];
  }, [query, recent, theme, toggleTheme, navigate, pathname, onClose, reach, toast]);

  const shown = Math.min(active, Math.max(commands.length - 1, 0));
  const current = commands[shown];
  const optionId = (i: number) => `${listId}-opt-${i}`;

  const move = (to: number) => {
    if (commands.length === 0) return;
    const next = (to + commands.length) % commands.length;
    setActive(next);
    const tool = commands[next]?.tool;
    if (tool?.ready) prefetchTool(tool.id);
    document.getElementById(optionId(next))?.scrollIntoView({ block: 'nearest' });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      move(shown + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      move(shown - 1);
    } else if (e.key === 'Home' && e.ctrlKey) {
      e.preventDefault();
      move(0);
    } else if (e.key === 'End' && e.ctrlKey) {
      e.preventDefault();
      move(commands.length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      current?.run();
    }
  };

  return (
    <Sheet label="Search tools and actions" onClose={onClose} testId="command-palette" phone="top">
      <div className="flex items-center gap-3 border-b-2 border-line px-5 transition-colors focus-within:border-violet">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0 text-muted">
          <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          // The sheet opens on purpose, so the field takes focus right away.
          autoFocus
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={current ? optionId(shown) : undefined}
          aria-autocomplete="list"
          aria-label="Search tools and actions"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="What do you want to do?"
          autoComplete="off"
          spellCheck={false}
          className="palette-input h-16 min-w-0 flex-1 bg-transparent font-display text-lg font-semibold tracking-tight placeholder:font-normal placeholder:text-muted sm:text-xl"
        />
        <span className="hidden sm:block">
          <Key>Esc</Key>
        </span>
      </div>

      <p className="sr-only" aria-live="polite">
        {query.trim() ? `${commands.length} ${commands.length === 1 ? 'result' : 'results'}` : ''}
      </p>

      {commands.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <Pip pose="puzzled" className="h-20" />
          <p className="mt-3 font-display text-lg font-bold tracking-tight text-balance">
            Nothing called “{query.trim()}” yet
          </p>
          <p className="mt-1 text-sm text-muted">Try “pdf”, “photo” or “passport”.</p>
        </div>
      ) : (
        <ul
          id={listId}
          role="listbox"
          aria-label="Results"
          className="max-h-[min(56vh,28rem)] overflow-y-auto overscroll-contain p-2"
        >
          {commands.map((c, i) => {
            const selected = i === shown;
            const heading = commands[i - 1]?.group !== c.group ? c.group : null;
            return (
              <li key={c.key} role="presentation">
                {heading ? (
                  <p
                    role="presentation"
                    className="px-3 pt-3 pb-1.5 text-xs font-semibold text-muted first:pt-1"
                  >
                    {heading === 'Recent' ? 'Opened lately' : heading}
                  </p>
                ) : null}
                <div
                  id={optionId(i)}
                  role="option"
                  aria-selected={selected}
                  data-group={c.group}
                  onPointerMove={() => {
                    if (!selected) setActive(i);
                  }}
                  onClick={() => c.run()}
                  className="relative flex cursor-pointer items-center gap-3.5 rounded-control px-3 py-2.5"
                >
                  {selected ? (
                    <motion.span
                      layoutId={still ? undefined : `${listId}-hl`}
                      aria-hidden="true"
                      className="absolute inset-0 rounded-control bg-surface-strong"
                      transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                    >
                      <span
                        className={`absolute top-2.5 bottom-2.5 left-0 w-1 rounded-full bg-current ${accentText[c.accent]}`}
                      />
                    </motion.span>
                  ) : null}
                  <span
                    className={`relative grid size-10 shrink-0 place-items-center rounded-xl border ${accentSoft[c.accent]}`}
                  >
                    {c.icon}
                  </span>
                  <span className="relative min-w-0 flex-1">
                    <span className="block font-semibold">{c.title}</span>
                    <span className="block truncate text-sm text-muted">{c.detail}</span>
                  </span>
                  {selected ? (
                    <span className="relative hidden sm:block">
                      <Key>↵</Key>
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="hidden items-center gap-4 border-t border-line px-5 py-3 text-xs text-muted sm:flex">
        <span className="flex items-center gap-1.5">
          <Key>↑</Key>
          <Key>↓</Key> to move
        </span>
        <span className="flex items-center gap-1.5">
          <Key>↵</Key> to open
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <Key>Esc</Key> to close
        </span>
      </div>
    </Sheet>
  );
}

const s = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <circle cx="12" cy="12" r="4" {...s} />
      <path
        d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"
        {...s}
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z" {...s} />
    </svg>
  );
}

function KeysIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="2.5" {...s} />
      <path d="M7 10h.01M11 10h.01M15 10h.01M8 14h8" {...s} />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1Z" {...s} />
    </svg>
  );
}

function InstallIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" {...s} />
      <path d="M12 7v7m0 0-3-3m3 3 3-3M10 18.5h4" {...s} />
    </svg>
  );
}
