import type { ToolInfo } from '../tools';

/**
 * Edit distance between two short strings: insert, delete or change one
 * letter, or swap two neighbours ("spilt" is one step from "split").
 */
export function distance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  const at = (i: number, j: number) => d[i]?.[j] ?? 0;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(at(i - 1, j) + 1, at(i, j - 1) + 1, at(i - 1, j - 1) + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, at(i - 2, j - 2) + 1);
      }
      (d[i] as number[])[j] = v;
    }
  }
  return at(a.length, b.length);
}

/** Words a person might type for a tool: its id and the words of its name. */
const wordsOf = (t: ToolInfo) => [t.id, ...t.name.toLowerCase().split(/\s+/)];

/**
 * Tools that look like what a broken link was reaching for, best first.
 * "/tools/merg" finds Merge PDF, "#/compres" finds both compress tools.
 * Short or unrelated paths find nothing, so the page never guesses wildly.
 */
export function nearTools(path: string, tools: readonly ToolInfo[], max = 3): ToolInfo[] {
  const parts = decodeURIComponent(path)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length >= 3 && p !== 'tools' && p !== 'pdf');
  if (parts.length === 0) return [];

  const scored = tools
    .map((tool) => {
      let best = Infinity;
      for (const part of parts) {
        for (const word of wordsOf(tool)) {
          if (word.length < 3) continue;
          // A typed start of the word ("comp", "rot") counts as a near match.
          const d = word.startsWith(part) ? 0 : distance(part, word);
          best = Math.min(best, d / Math.max(word.length, part.length));
        }
      }
      return { tool, best };
    })
    .filter((s) => s.best <= 0.34)
    .sort((a, b) => a.best - b.best);

  return scored.slice(0, max).map((s) => s.tool);
}
