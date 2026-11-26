function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="inline size-[1.15em] -translate-y-px align-middle text-sky"
      aria-hidden="true"
    >
      <path
        d="M12 15V4m0 0L8 8m4-4 4 4M7 11H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** How to add the site to the home screen in Safari on iPhone and iPad. */
export function IosSteps({ className = '' }: { className?: string }) {
  return (
    <ol className={`space-y-1.5 text-[0.95rem] ${className}`} data-testid="install-steps">
      <li>
        <span className="font-semibold">1.</span> Tap <ShareIcon />{' '}
        <span className="font-semibold">Share</span> in Safari&rsquo;s toolbar.
      </li>
      <li>
        <span className="font-semibold">2.</span> Choose{' '}
        <span className="font-semibold">Add to Home Screen</span>.
      </li>
    </ol>
  );
}
