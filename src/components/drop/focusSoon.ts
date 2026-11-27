/**
 * Focus the first element matching `selector` inside `root` once it exists.
 * Slips and drop sheets swap in after a short exit animation, so the target is
 * often not on the page yet when the click that needs it happens. Gives up if
 * focus has meanwhile gone somewhere else on purpose.
 */
export function focusSoon(root: ParentNode | null, selector: string, within = 3000) {
  if (!root) return () => {};
  const until = performance.now() + within;
  const start = document.activeElement;
  let frame = 0;
  const tick = () => {
    // Someone already moved focus on purpose: leave it there.
    const now = document.activeElement;
    if (now !== start && !focusIsLost()) return;
    const el = root.querySelector<HTMLElement>(selector);
    if (el) el.focus();
    else if (performance.now() < until) frame = requestAnimationFrame(tick);
  };
  tick();
  return () => cancelAnimationFrame(frame);
}

/** True when focus sits nowhere useful, e.g. after the focused button was removed. */
export function focusIsLost() {
  const a = document.activeElement;
  return !a || a === document.body || !a.isConnected;
}
