export type Accent = 'violet' | 'coral' | 'mint' | 'sunshine' | 'sky';

/*
 * Full class strings (not template-built) so Tailwind can see them at build
 * time. One map per use keeps the per-tool accent consistent everywhere.
 */
export const accentFill: Record<Accent, string> = {
  violet: 'bg-violet-fill text-on-violet',
  coral: 'bg-coral text-on-accent',
  mint: 'bg-mint text-on-accent',
  sunshine: 'bg-sunshine text-on-accent',
  sky: 'bg-sky text-on-accent',
};

export const accentText: Record<Accent, string> = {
  violet: 'text-violet-ink',
  coral: 'text-coral',
  mint: 'text-mint',
  sunshine: 'text-sunshine',
  sky: 'text-sky',
};

export const accentSoft: Record<Accent, string> = {
  violet: 'bg-violet/15 text-violet border-violet/25',
  coral: 'bg-coral/15 text-coral border-coral/25',
  mint: 'bg-mint/15 text-mint border-mint/25',
  sunshine: 'bg-sunshine/15 text-sunshine border-sunshine/25',
  sky: 'bg-sky/15 text-sky border-sky/25',
};

export const accentDot: Record<Accent, string> = {
  violet: 'bg-violet',
  coral: 'bg-coral',
  mint: 'bg-mint',
  sunshine: 'bg-sunshine',
  sky: 'bg-sky',
};

export const accentGlow: Record<Accent, string> = {
  violet: 'hover:shadow-glow-violet focus-within:shadow-glow-violet',
  coral: 'hover:shadow-glow-coral focus-within:shadow-glow-coral',
  mint: 'hover:shadow-glow-mint focus-within:shadow-glow-mint',
  sunshine: 'hover:shadow-glow-sunshine focus-within:shadow-glow-sunshine',
  sky: 'hover:shadow-glow-sky focus-within:shadow-glow-sky',
};

export const accentButtonGlow: Record<Accent, string> = {
  violet: 'hover:shadow-glow-violet',
  coral: 'hover:shadow-glow-coral',
  mint: 'hover:shadow-glow-mint',
  sunshine: 'hover:shadow-glow-sunshine',
  sky: 'hover:shadow-glow-sky',
};

/** A card that can take the file being dragged: accent edge and a steady glow. */
export const accentReady: Record<Accent, string> = {
  violet: 'border-violet/70 shadow-glow-violet',
  coral: 'border-coral/70 shadow-glow-coral',
  mint: 'border-mint/70 shadow-glow-mint',
  sunshine: 'border-sunshine/70 shadow-glow-sunshine',
  sky: 'border-sky/70 shadow-glow-sky',
};
