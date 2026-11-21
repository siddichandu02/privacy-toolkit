/*
 * Files dropped on the home page, waiting for the tool page that was picked.
 * They stay in memory only, like everything else, and are gone on reload.
 */
let pending: { toolId: string; files: File[] } | null = null;

/** Keep files for a tool page that is about to open. */
export function handOff(toolId: string, files: readonly File[]): void {
  pending = files.length ? { toolId, files: [...files] } : null;
}

/**
 * The files waiting for this tool, without clearing them. Safe to call more
 * than once while a page renders; call `clearHandoff` once it has mounted.
 */
export function peekHandoff(toolId: string): File[] {
  return pending?.toolId === toolId ? pending.files : [];
}

export function clearHandoff(toolId?: string): void {
  if (toolId === undefined || pending?.toolId === toolId) pending = null;
}
