const ENTRY = /assets\/index-[\w-]+\.js/;

/** The hashed entry script named in a page, e.g. "assets/index-abc123.js". */
export function entryScript(html: string): string | null {
  for (const tag of html.match(/<script\b[^>]*>/g) ?? []) {
    if (!/type="module"/.test(tag)) continue;
    const src = /src="([^"]+)"/.exec(tag)?.[1];
    const entry = src ? ENTRY.exec(src)?.[0] : undefined;
    if (entry) return entry;
  }
  return null;
}

function currentEntry(): string | null {
  for (const script of document.querySelectorAll<HTMLScriptElement>('script[type="module"]')) {
    const entry = ENTRY.exec(script.getAttribute('src') ?? '')?.[0];
    if (entry) return entry;
  }
  return null;
}

/**
 * Ask the server for the live page and compare its entry script with ours.
 * A new deploy renames every hashed file, so a different name means this tab
 * is running an older version. Any failure counts as "not newer".
 */
export async function hasNewerVersion(): Promise<boolean> {
  const mine = currentEntry();
  if (!mine) return false;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}?check=${Date.now()}`, {
      cache: 'no-store',
    });
    if (!res.ok) return false;
    const live = entryScript(await res.text());
    return live !== null && live !== mine;
  } catch {
    return false;
  }
}
